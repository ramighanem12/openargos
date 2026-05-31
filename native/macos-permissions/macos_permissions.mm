#include <node_api.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#import <AVFoundation/AVFoundation.h>
#import <Carbon/Carbon.h>
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#include <algorithm>
#include <chrono>
#include <cctype>
#include <cmath>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_set>
#include <vector>

namespace {

struct ShortcutEventData {
  std::string type;
};

CFMachPortRef shortcutEventTap = nullptr;
CFRunLoopSourceRef shortcutRunLoopSource = nullptr;
napi_threadsafe_function shortcutCallback = nullptr;
CGKeyCode shortcutKeyCode = kVK_ANSI_M;
CGEventFlags shortcutRequiredFlags = kCGEventFlagMaskAlternate;
bool shortcutIsDown = false;
AVAudioRecorder *voiceRecorder = nil;
NSURL *voiceRecordingURL = nil;
NSDate *voiceRecordingStartedAt = nil;
dispatch_source_t voiceMeterTimer = nullptr;
float voiceRecordingMaxAveragePower = -160.0f;
float voiceRecordingMaxPeakPower = -160.0f;
uint32_t voiceRecordingMeterSamples = 0;

napi_value BooleanResult(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

void SetBool(napi_env env, napi_value object, const char *name, bool value) {
  napi_value property;
  napi_get_boolean(env, value, &property);
  napi_set_named_property(env, object, name, property);
}

void SetInt(napi_env env, napi_value object, const char *name, int32_t value) {
  napi_value property;
  napi_create_int32(env, value, &property);
  napi_set_named_property(env, object, name, property);
}

void SetString(napi_env env, napi_value object, const char *name, const char *value) {
  napi_value property;
  napi_create_string_utf8(env, value ? value : "", NAPI_AUTO_LENGTH, &property);
  napi_set_named_property(env, object, name, property);
}

void SetString(napi_env env, napi_value object, const char *name, const std::string &value) {
  SetString(env, object, name, value.c_str());
}

void SetDouble(napi_env env, napi_value object, const char *name, double value) {
  napi_value property;
  napi_create_double(env, value, &property);
  napi_set_named_property(env, object, name, property);
}

void ArrayPush(napi_env env, napi_value array, napi_value value) {
  uint32_t length = 0;
  napi_get_array_length(env, array, &length);
  napi_set_element(env, array, length, value);
}

bool GetOptionsArg(napi_env env, napi_callback_info info, napi_value *options) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1) return false;
  napi_valuetype type = napi_undefined;
  napi_typeof(env, argv[0], &type);
  if (type != napi_object) return false;
  *options = argv[0];
  return true;
}

bool GetNamedDouble(napi_env env, napi_value object, const char *name, double *out);

NSData *GetNamedBuffer(napi_env env, napi_value object, const char *name) {
  if (!object) return nil;
  bool has = false;
  napi_has_named_property(env, object, name, &has);
  if (!has) return nil;
  napi_value value;
  napi_get_named_property(env, object, name, &value);
  bool isBuffer = false;
  napi_is_buffer(env, value, &isBuffer);
  if (!isBuffer) return nil;
  void *data = nullptr;
  size_t length = 0;
  if (napi_get_buffer_info(env, value, &data, &length) != napi_ok || !data || length == 0) return nil;
  return [NSData dataWithBytes:data length:length];
}

int OptionInt(napi_env env, napi_value options, const char *name, int fallback, int min, int max) {
  if (!options) return fallback;
  double value = fallback;
  if (!GetNamedDouble(env, options, name, &value)) return fallback;
  if (!std::isfinite(value)) return fallback;
  return std::max(min, std::min(max, static_cast<int>(std::round(value))));
}

double OptionDouble(napi_env env, napi_value options, const char *name, double fallback, double min, double max) {
  if (!options) return fallback;
  double value = fallback;
  if (!GetNamedDouble(env, options, name, &value)) return fallback;
  if (!std::isfinite(value)) return fallback;
  return std::max(min, std::min(max, value));
}

std::string NSStringToStdString(NSString *value) {
  return value ? std::string([value UTF8String]) : "";
}

double AudioPowerToLinear(float decibels) {
  if (decibels <= -159.0f) return 0.0;
  return pow(10.0, static_cast<double>(decibels) / 20.0);
}

napi_value ErrorObject(napi_env env, const char *code, const char *message) {
  napi_value result;
  napi_create_object(env, &result);
  SetBool(env, result, "ok", false);
  SetString(env, result, "code", code);
  SetString(env, result, "message", message);
  return result;
}

std::string StringFromCFType(CFTypeRef value) {
  if (!value) return "";
  NSString *stringValue = nil;
  if (CFGetTypeID(value) == CFStringGetTypeID()) {
    stringValue = (__bridge NSString *)value;
  } else if (CFGetTypeID(value) == CFNumberGetTypeID()) {
    stringValue = [(__bridge NSNumber *)value stringValue];
  } else if ([(__bridge id)value respondsToSelector:@selector(stringValue)]) {
    stringValue = [(__bridge id)value stringValue];
  } else if ([(__bridge id)value isKindOfClass:[NSArray class]]) {
    NSArray *arrayValue = (__bridge NSArray *)value;
    stringValue = [[arrayValue valueForKey:@"description"] componentsJoinedByString:@", "];
  }
  return stringValue ? std::string([stringValue UTF8String]) : "";
}

std::string AXStringAttribute(AXUIElementRef element, CFStringRef attribute) {
  if (!element) return "";
  CFTypeRef value = nullptr;
  AXError error = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (error != kAXErrorSuccess || !value) return "";
  std::string result = StringFromCFType(value);
  CFRelease(value);
  return result;
}

bool GetNamedDouble(napi_env env, napi_value object, const char *name, double *out) {
  bool has = false;
  napi_has_named_property(env, object, name, &has);
  if (!has) return false;
  napi_value value;
  napi_get_named_property(env, object, name, &value);
  return napi_get_value_double(env, value, out) == napi_ok;
}

bool GetNamedString(napi_env env, napi_value object, const char *name, std::string *out) {
  bool has = false;
  napi_has_named_property(env, object, name, &has);
  if (!has) return false;
  napi_value value;
  napi_get_named_property(env, object, name, &value);
  size_t length = 0;
  napi_get_value_string_utf8(env, value, nullptr, 0, &length);
  std::vector<char> buffer(length + 1);
  napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(), &length);
  *out = std::string(buffer.data(), length);
  return true;
}

std::string LowercaseString(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return value;
}

std::vector<std::string> GetNamedStringArray(napi_env env, napi_value object, const char *name) {
  std::vector<std::string> values;
  if (!object) return values;
  bool has = false;
  napi_has_named_property(env, object, name, &has);
  if (!has) return values;
  napi_value arrayValue;
  napi_get_named_property(env, object, name, &arrayValue);
  bool isArray = false;
  napi_is_array(env, arrayValue, &isArray);
  if (!isArray) return values;
  uint32_t length = 0;
  napi_get_array_length(env, arrayValue, &length);
  for (uint32_t index = 0; index < length; index += 1) {
    napi_value item;
    napi_get_element(env, arrayValue, index, &item);
    size_t itemLength = 0;
    if (napi_get_value_string_utf8(env, item, nullptr, 0, &itemLength) != napi_ok || itemLength == 0) continue;
    std::vector<char> buffer(itemLength + 1);
    napi_get_value_string_utf8(env, item, buffer.data(), buffer.size(), &itemLength);
    values.push_back(LowercaseString(std::string(buffer.data(), itemLength)));
  }
  return values;
}

bool NativeAppBlocked(NSString *appName, NSString *title, const std::vector<std::string> &blockList) {
  if (blockList.empty()) return false;
  const std::string app = LowercaseString(NSStringToStdString(appName));
  const std::string windowTitle = LowercaseString(NSStringToStdString(title));
  for (const std::string &blocked : blockList) {
    if (blocked.empty()) continue;
    if ((!app.empty() && (app == blocked || app.find(blocked) != std::string::npos || blocked.find(app) != std::string::npos)) ||
        (!windowTitle.empty() && windowTitle.find(blocked) != std::string::npos)) {
      return true;
    }
  }
  return false;
}

std::string CollapseWhitespace(const std::string &value) {
  std::string result;
  result.reserve(value.size());
  bool inWhitespace = false;
  for (unsigned char c : value) {
    if (std::isspace(c)) {
      inWhitespace = true;
      continue;
    }
    if (inWhitespace && !result.empty()) result.push_back(' ');
    result.push_back(static_cast<char>(c));
    inWhitespace = false;
  }
  return result;
}

void AppendTextPart(std::vector<std::string> *parts,
                    std::unordered_set<std::string> *seen,
                    size_t *totalLength,
                    size_t maxLength,
                    const std::string &rawValue) {
  if (!parts || !seen || !totalLength || *totalLength >= maxLength) return;
  std::string value = CollapseWhitespace(rawValue);
  if (value.empty() || value.size() < 2) return;
  if (seen->find(value) != seen->end()) return;
  seen->insert(value);
  if (*totalLength + value.size() + 1 > maxLength) {
    const size_t remaining = maxLength > *totalLength ? maxLength - *totalLength : 0;
    if (remaining < 24) return;
    value = value.substr(0, remaining - 13) + " [Truncated]";
  }
  *totalLength += value.size() + 1;
  parts->push_back(value);
}

std::string JoinTextParts(const std::vector<std::string> &parts) {
  std::ostringstream stream;
  for (size_t index = 0; index < parts.size(); index += 1) {
    if (index > 0) stream << "\n";
    stream << parts[index];
  }
  return stream.str();
}

CGImageRef CopyCGImageFromData(NSData *data) {
  if (!data || [data length] == 0) return nullptr;
  NSImage *image = [[[NSImage alloc] initWithData:data] autorelease];
  if (!image) return nullptr;
  CGRect proposed = CGRectMake(0, 0, image.size.width, image.size.height);
  CGImageRef cgImage = [image CGImageForProposedRect:&proposed context:nil hints:nil];
  return cgImage ? CGImageRetain(cgImage) : nullptr;
}

NSString *JoinNSStringParts(NSArray<NSString *> *parts) {
  if (!parts || [parts count] == 0) return @"";
  return [parts componentsJoinedByString:@"\n"];
}

void CollectAXElementText(AXUIElementRef element,
                          int depth,
                          int maxDepth,
                          int maxNodes,
                          size_t maxTextLength,
                          int *nodeCount,
                          size_t *totalLength,
                          std::unordered_set<uintptr_t> *visited,
                          std::unordered_set<std::string> *seenText,
                          std::vector<std::string> *parts) {
  if (!element || !nodeCount || !totalLength || !visited || !seenText || !parts) return;
  if (depth > maxDepth || *nodeCount >= maxNodes || *totalLength >= maxTextLength) return;
  const uintptr_t key = reinterpret_cast<uintptr_t>(element);
  if (visited->find(key) != visited->end()) return;
  visited->insert(key);
  *nodeCount += 1;

  const CFStringRef textAttributes[] = {
    kAXTitleAttribute,
    kAXValueAttribute,
    kAXDescriptionAttribute,
    kAXHelpAttribute,
    kAXRoleDescriptionAttribute
  };
  for (CFStringRef attribute : textAttributes) {
    AppendTextPart(parts, seenText, totalLength, maxTextLength, AXStringAttribute(element, attribute));
  }

  const CFStringRef childAttributes[] = {
    kAXChildrenAttribute,
    CFSTR("AXVisibleChildren"),
    CFSTR("AXRows"),
    CFSTR("AXColumns"),
    CFSTR("AXContents")
  };
  for (CFStringRef attribute : childAttributes) {
    if (*nodeCount >= maxNodes || *totalLength >= maxTextLength) return;
    CFTypeRef value = nullptr;
    AXError error = AXUIElementCopyAttributeValue(element, attribute, &value);
    if (error != kAXErrorSuccess || !value) continue;
    if (CFGetTypeID(value) == CFArrayGetTypeID()) {
      CFArrayRef array = static_cast<CFArrayRef>(value);
      const CFIndex count = CFArrayGetCount(array);
      for (CFIndex index = 0; index < count; index += 1) {
        CFTypeRef child = CFArrayGetValueAtIndex(array, index);
        if (!child) continue;
        if (CFGetTypeID(child) == AXUIElementGetTypeID()) {
          CollectAXElementText(static_cast<AXUIElementRef>(child),
                               depth + 1,
                               maxDepth,
                               maxNodes,
                               maxTextLength,
                               nodeCount,
                               totalLength,
                               visited,
                               seenText,
                               parts);
        } else {
          AppendTextPart(parts, seenText, totalLength, maxTextLength, StringFromCFType(child));
        }
      }
    } else if (CFGetTypeID(value) == AXUIElementGetTypeID()) {
      CollectAXElementText(static_cast<AXUIElementRef>(value),
                           depth + 1,
                           maxDepth,
                           maxNodes,
                           maxTextLength,
                           nodeCount,
                           totalLength,
                           visited,
                           seenText,
                           parts);
    } else {
      AppendTextPart(parts, seenText, totalLength, maxTextLength, StringFromCFType(value));
    }
    CFRelease(value);
  }
}

std::string NormalizeKeyName(std::string key) {
  key.erase(std::remove_if(key.begin(), key.end(), [](unsigned char c) {
    return c == '-' || c == '_' || std::isspace(c);
  }), key.end());
  std::transform(key.begin(), key.end(), key.begin(), [](unsigned char c) {
    return static_cast<char>(std::toupper(c));
  });
  return key;
}

bool KeyCodeForName(const std::string &rawKey, CGKeyCode *code) {
  const std::string key = NormalizeKeyName(rawKey);
  if (key.size() == 1) {
    char c = key[0];
    if (c >= 'A' && c <= 'Z') {
      static const CGKeyCode codes[] = {
        kVK_ANSI_A, kVK_ANSI_B, kVK_ANSI_C, kVK_ANSI_D, kVK_ANSI_E, kVK_ANSI_F,
        kVK_ANSI_G, kVK_ANSI_H, kVK_ANSI_I, kVK_ANSI_J, kVK_ANSI_K, kVK_ANSI_L,
        kVK_ANSI_M, kVK_ANSI_N, kVK_ANSI_O, kVK_ANSI_P, kVK_ANSI_Q, kVK_ANSI_R,
        kVK_ANSI_S, kVK_ANSI_T, kVK_ANSI_U, kVK_ANSI_V, kVK_ANSI_W, kVK_ANSI_X,
        kVK_ANSI_Y, kVK_ANSI_Z
      };
      *code = codes[c - 'A'];
      return true;
    }
    if (c >= '0' && c <= '9') {
      static const CGKeyCode codes[] = {
        kVK_ANSI_0, kVK_ANSI_1, kVK_ANSI_2, kVK_ANSI_3, kVK_ANSI_4,
        kVK_ANSI_5, kVK_ANSI_6, kVK_ANSI_7, kVK_ANSI_8, kVK_ANSI_9
      };
      *code = codes[c - '0'];
      return true;
    }
  }

  if (key == "RETURN" || key == "ENTER") *code = kVK_Return;
  else if (key == "TAB") *code = kVK_Tab;
  else if (key == "SPACE") *code = kVK_Space;
  else if (key == "DELETE" || key == "BACKSPACE") *code = kVK_Delete;
  else if (key == "FORWARDDELETE" || key == "DEL") *code = kVK_ForwardDelete;
  else if (key == "ESC" || key == "ESCAPE") *code = kVK_Escape;
  else if (key == "UP" || key == "ARROWUP") *code = kVK_UpArrow;
  else if (key == "DOWN" || key == "ARROWDOWN") *code = kVK_DownArrow;
  else if (key == "LEFT" || key == "ARROWLEFT") *code = kVK_LeftArrow;
  else if (key == "RIGHT" || key == "ARROWRIGHT") *code = kVK_RightArrow;
  else if (key == "HOME") *code = kVK_Home;
  else if (key == "END") *code = kVK_End;
  else if (key == "PAGEUP") *code = kVK_PageUp;
  else if (key == "PAGEDOWN") *code = kVK_PageDown;
  else return false;
  return true;
}

CGEventFlags ModifierFlagForName(const std::string &rawKey) {
  const std::string key = NormalizeKeyName(rawKey);
  if (key == "CMD" || key == "COMMAND" || key == "META") return kCGEventFlagMaskCommand;
  if (key == "SHIFT") return kCGEventFlagMaskShift;
  if (key == "CTRL" || key == "CONTROL") return kCGEventFlagMaskControl;
  if (key == "ALT" || key == "OPTION") return kCGEventFlagMaskAlternate;
  if (key == "FN" || key == "FUNCTION") return kCGEventFlagMaskSecondaryFn;
  return 0;
}

bool ShortcutModifiersMatch(CGEventFlags flags) {
  const CGEventFlags relevantFlags = kCGEventFlagMaskCommand |
    kCGEventFlagMaskShift |
    kCGEventFlagMaskControl |
    kCGEventFlagMaskAlternate |
    kCGEventFlagMaskSecondaryFn;
  return (flags & relevantFlags) == shortcutRequiredFlags;
}

void ShortcutJsCallback(napi_env env, napi_value jsCallback, void *, void *rawData) {
  ShortcutEventData *data = static_cast<ShortcutEventData *>(rawData);
  if (!env || !jsCallback || !data) {
    delete data;
    return;
  }

  napi_value event;
  napi_create_object(env, &event);
  SetString(env, event, "type", data->type);
  SetString(env, event, "source", "native-shortcut");

  napi_value argv[] = {event};
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  napi_call_function(env, undefined, jsCallback, 1, argv, nullptr);
  delete data;
}

void EmitShortcutEvent(const std::string &type) {
  if (!shortcutCallback) return;
  ShortcutEventData *data = new ShortcutEventData{type};
  napi_status status = napi_call_threadsafe_function(shortcutCallback, data, napi_tsfn_nonblocking);
  if (status != napi_ok) delete data;
}

CGEventRef ShortcutEventCallback(CGEventTapProxy, CGEventType type, CGEventRef event, void *) {
  if (type == kCGEventTapDisabledByTimeout || type == kCGEventTapDisabledByUserInput) {
    if (shortcutEventTap) CGEventTapEnable(shortcutEventTap, true);
    return event;
  }

  const CGKeyCode keyCode = static_cast<CGKeyCode>(
    CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode)
  );
  const CGEventFlags flags = CGEventGetFlags(event);

  if (type == kCGEventKeyDown &&
      keyCode == shortcutKeyCode &&
      ShortcutModifiersMatch(flags) &&
      !CGEventGetIntegerValueField(event, kCGKeyboardEventAutorepeat)) {
    if (!shortcutIsDown) {
      shortcutIsDown = true;
      EmitShortcutEvent("down");
    }
    return nullptr;
  }

  if (type == kCGEventKeyUp && keyCode == shortcutKeyCode && shortcutIsDown) {
    shortcutIsDown = false;
    EmitShortcutEvent("up");
    return nullptr;
  }

  if (type == kCGEventFlagsChanged && shortcutIsDown && !ShortcutModifiersMatch(flags)) {
    shortcutIsDown = false;
    EmitShortcutEvent("up");
  }

  return event;
}

void StopShortcutMonitorInternal() {
  shortcutIsDown = false;
  if (shortcutRunLoopSource) {
    CFRunLoopRemoveSource(CFRunLoopGetMain(), shortcutRunLoopSource, kCFRunLoopCommonModes);
    CFRelease(shortcutRunLoopSource);
    shortcutRunLoopSource = nullptr;
  }
  if (shortcutEventTap) {
    CFMachPortInvalidate(shortcutEventTap);
    CFRelease(shortcutEventTap);
    shortcutEventTap = nullptr;
  }
  if (shortcutCallback) {
    napi_release_threadsafe_function(shortcutCallback, napi_tsfn_abort);
    shortcutCallback = nullptr;
  }
}

void StopVoiceRecorderInternal() {
  if (voiceMeterTimer) {
    dispatch_source_cancel(voiceMeterTimer);
    voiceMeterTimer = nullptr;
  }
  if (voiceRecorder) {
    if ([voiceRecorder isRecording]) [voiceRecorder stop];
    [voiceRecorder release];
    voiceRecorder = nil;
  }
  if (voiceRecordingURL) {
    [voiceRecordingURL release];
    voiceRecordingURL = nil;
  }
  if (voiceRecordingStartedAt) {
    [voiceRecordingStartedAt release];
    voiceRecordingStartedAt = nil;
  }
}

void ResetVoiceMeterStats() {
  voiceRecordingMaxAveragePower = -160.0f;
  voiceRecordingMaxPeakPower = -160.0f;
  voiceRecordingMeterSamples = 0;
}

void SampleVoiceMeter() {
  if (!voiceRecorder || ![voiceRecorder isRecording]) return;
  [voiceRecorder updateMeters];
  float averagePower = [voiceRecorder averagePowerForChannel:0];
  float peakPower = [voiceRecorder peakPowerForChannel:0];
  if (averagePower > voiceRecordingMaxAveragePower) voiceRecordingMaxAveragePower = averagePower;
  if (peakPower > voiceRecordingMaxPeakPower) voiceRecordingMaxPeakPower = peakPower;
  voiceRecordingMeterSamples += 1;
}

void StartVoiceMeterTimer() {
  if (voiceMeterTimer) {
    dispatch_source_cancel(voiceMeterTimer);
    voiceMeterTimer = nullptr;
  }
  ResetVoiceMeterStats();
  SampleVoiceMeter();
  voiceMeterTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_main_queue());
  if (!voiceMeterTimer) return;
  dispatch_source_set_timer(
    voiceMeterTimer,
    dispatch_time(DISPATCH_TIME_NOW, 0),
    100 * NSEC_PER_MSEC,
    20 * NSEC_PER_MSEC
  );
  dispatch_source_set_event_handler(voiceMeterTimer, ^{
    SampleVoiceMeter();
  });
  dispatch_resume(voiceMeterTimer);
}

void StopVoiceMeterTimer() {
  if (!voiceMeterTimer) return;
  dispatch_source_cancel(voiceMeterTimer);
  voiceMeterTimer = nullptr;
}

NSString *CurrentAudioInputDeviceName() {
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeAudio];
  return device.localizedName ?: @"";
}

bool EnsureMicrophoneAccess() {
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
  if (status == AVAuthorizationStatusAuthorized) return true;
  if (status == AVAuthorizationStatusDenied || status == AVAuthorizationStatusRestricted) return false;

  __block bool allowed = false;
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) {
    allowed = granted;
    dispatch_semaphore_signal(semaphore);
  }];
  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
  return allowed;
}

void PostKeyboardEvent(CGKeyCode code, bool down, CGEventFlags flags) {
  CGEventRef event = CGEventCreateKeyboardEvent(nullptr, code, down);
  CGEventSetFlags(event, flags);
  CGEventPost(kCGHIDEventTap, event);
  CFRelease(event);
}

CGEventType MouseDownType(const std::string &button) {
  if (button == "right") return kCGEventRightMouseDown;
  if (button == "middle") return kCGEventOtherMouseDown;
  return kCGEventLeftMouseDown;
}

CGEventType MouseUpType(const std::string &button) {
  if (button == "right") return kCGEventRightMouseUp;
  if (button == "middle") return kCGEventOtherMouseUp;
  return kCGEventLeftMouseUp;
}

CGEventType MouseDraggedType(const std::string &button) {
  if (button == "right") return kCGEventRightMouseDragged;
  if (button == "middle") return kCGEventOtherMouseDragged;
  return kCGEventLeftMouseDragged;
}

CGMouseButton MouseButton(const std::string &button) {
  if (button == "right") return kCGMouseButtonRight;
  if (button == "middle") return kCGMouseButtonCenter;
  return kCGMouseButtonLeft;
}

void PostMouseEvent(CGEventType type, CGPoint point, const std::string &button = "left", int64_t clickState = 0) {
  CGEventRef event = CGEventCreateMouseEvent(nullptr, type, point, MouseButton(button));
  if (clickState > 0) CGEventSetIntegerValueField(event, kCGMouseEventClickState, clickState);
  CGEventPost(kCGHIDEventTap, event);
  CFRelease(event);
}

napi_value CaptureAccessibilityText(napi_env env, napi_callback_info info) {
  if (!AXIsProcessTrusted()) {
    return ErrorObject(env, "accessibility_not_granted", "Accessibility permission is not granted.");
  }

  @autoreleasepool {
    napi_value options = nullptr;
    GetOptionsArg(env, info, &options);
    const int maxApps = OptionInt(env, options, "maxApps", 24, 1, 80);
    const int maxWindowsPerApp = OptionInt(env, options, "maxWindowsPerApp", 6, 1, 24);
    const int maxNodesPerWindow = OptionInt(env, options, "maxNodesPerWindow", 1800, 100, 10000);
    const int maxDepth = OptionInt(env, options, "maxDepth", 16, 2, 40);
    const int maxTextLength = OptionInt(env, options, "maxTextLength", 60000, 1000, 240000);
    const std::vector<std::string> appBlockList = GetNamedStringArray(env, options, "appBlockList");

    napi_value result;
    napi_create_object(env, &result);
    SetBool(env, result, "ok", true);
    SetString(env, result, "source", "accessibility");
    napi_value appsArray;
    napi_create_array(env, &appsArray);

    int appCount = 0;
    NSArray *runningApps = [[NSWorkspace sharedWorkspace] runningApplications];
    for (NSRunningApplication *app in runningApps) {
      if (appCount >= maxApps) break;
      if ([app isTerminated]) continue;
      if ([app activationPolicy] == NSApplicationActivationPolicyProhibited) continue;
      NSString *appName = [app localizedName];
      if (!appName || [appName length] == 0) continue;
      if (NativeAppBlocked(appName, nil, appBlockList)) continue;

      pid_t pid = [app processIdentifier];
      AXUIElementRef appElement = AXUIElementCreateApplication(pid);
      if (!appElement) continue;

      CFTypeRef windowsValue = nullptr;
      AXError error = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute, &windowsValue);
      if (error != kAXErrorSuccess || !windowsValue || CFGetTypeID(windowsValue) != CFArrayGetTypeID()) {
        if (windowsValue) CFRelease(windowsValue);
        CFRelease(appElement);
        continue;
      }

      napi_value windowsArray;
      napi_create_array(env, &windowsArray);
      int capturedWindows = 0;
      CFArrayRef windows = static_cast<CFArrayRef>(windowsValue);
      const CFIndex windowCount = CFArrayGetCount(windows);
      for (CFIndex index = 0; index < windowCount && capturedWindows < maxWindowsPerApp; index += 1) {
        AXUIElementRef windowElement = static_cast<AXUIElementRef>(CFArrayGetValueAtIndex(windows, index));
        if (!windowElement || CFGetTypeID(windowElement) != AXUIElementGetTypeID()) continue;

        std::vector<std::string> parts;
        std::unordered_set<std::string> seenText;
        std::unordered_set<uintptr_t> visited;
        int nodeCount = 0;
        size_t totalLength = 0;
        std::string title = AXStringAttribute(windowElement, kAXTitleAttribute);
        AppendTextPart(&parts, &seenText, &totalLength, static_cast<size_t>(maxTextLength), title);
        CollectAXElementText(windowElement,
                             0,
                             maxDepth,
                             maxNodesPerWindow,
                             static_cast<size_t>(maxTextLength),
                             &nodeCount,
                             &totalLength,
                             &visited,
                             &seenText,
                             &parts);
        std::string text = JoinTextParts(parts);
        if (text.empty() && title.empty()) continue;

        napi_value windowObject;
        napi_create_object(env, &windowObject);
        SetString(env, windowObject, "title", title);
        SetString(env, windowObject, "text", text);
        SetInt(env, windowObject, "nodesVisited", nodeCount);
        SetInt(env, windowObject, "textLength", static_cast<int>(text.size()));
        ArrayPush(env, windowsArray, windowObject);
        capturedWindows += 1;
      }

      CFRelease(windowsValue);
      CFRelease(appElement);
      if (capturedWindows == 0) continue;

      napi_value appObject;
      napi_create_object(env, &appObject);
      SetInt(env, appObject, "pid", static_cast<int>(pid));
      SetString(env, appObject, "app", NSStringToStdString(appName));
      SetInt(env, appObject, "windowCount", capturedWindows);
      napi_set_named_property(env, appObject, "windows", windowsArray);
      ArrayPush(env, appsArray, appObject);
      appCount += 1;
    }

    napi_set_named_property(env, result, "apps", appsArray);
    SetInt(env, result, "count", appCount);
    return result;
  }
}

napi_value RecognizeTextInImage(napi_env env, napi_callback_info info) {
  @autoreleasepool {
    napi_value options = nullptr;
    GetOptionsArg(env, info, &options);
    NSData *data = GetNamedBuffer(env, options, "data");
    if (!data || [data length] == 0) {
      return ErrorObject(env, "ocr_missing_image", "Image data is required for OCR.");
    }
    const int maxTextLength = OptionInt(env, options, "maxTextLength", 120000, 1000, 500000);
    const int maxObservations = OptionInt(env, options, "maxObservations", 2000, 50, 10000);
    const double minimumConfidence = OptionDouble(env, options, "minimumConfidence", 0.12, 0.0, 1.0);

    CGImageRef image = CopyCGImageFromData(data);
    if (!image) {
      return ErrorObject(env, "ocr_image_decode_failed", "Could not decode image for OCR.");
    }
    const size_t imageWidth = CGImageGetWidth(image);
    const size_t imageHeight = CGImageGetHeight(image);

    VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
    request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
    request.usesLanguageCorrection = YES;
    request.minimumTextHeight = 0.0;
    if (@available(macOS 13.0, *)) {
      request.automaticallyDetectsLanguage = YES;
    }

    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image options:@{}];
    NSError *error = nil;
    BOOL ok = [handler performRequests:@[request] error:&error];
    CGImageRelease(image);
    [handler release];
    if (!ok || error) {
      NSString *message = error.localizedDescription ?: @"Apple Vision OCR failed.";
      [request release];
      return ErrorObject(env, "ocr_failed", message.UTF8String);
    }

    NSMutableArray<NSString *> *textParts = [NSMutableArray array];
    napi_value observations;
    napi_create_array(env, &observations);
    int observationCount = 0;
    int totalLength = 0;
    for (VNRecognizedTextObservation *observation in request.results) {
      if (observationCount >= maxObservations || totalLength >= maxTextLength) break;
      NSArray<VNRecognizedText *> *candidates = [observation topCandidates:1];
      VNRecognizedText *candidate = [candidates firstObject];
      if (!candidate || candidate.confidence < minimumConfidence) continue;
      NSString *text = candidate.string ?: @"";
      if ([text length] == 0) continue;
      if (totalLength + static_cast<int>([text length]) > maxTextLength) {
        NSInteger remaining = std::max(0, maxTextLength - totalLength);
        if (remaining <= 0) break;
        text = [text substringToIndex:std::min<NSInteger>([text length], remaining)];
      }
      [textParts addObject:text];
      totalLength += static_cast<int>([text length]) + 1;

      CGRect box = observation.boundingBox;
      napi_value item;
      napi_create_object(env, &item);
      SetString(env, item, "text", text.UTF8String);
      SetDouble(env, item, "confidence", static_cast<double>(candidate.confidence));
      SetDouble(env, item, "x", box.origin.x);
      SetDouble(env, item, "y", box.origin.y);
      SetDouble(env, item, "width", box.size.width);
      SetDouble(env, item, "height", box.size.height);
      SetDouble(env, item, "pixelX", box.origin.x * static_cast<double>(imageWidth));
      SetDouble(env, item, "pixelY", (1.0 - box.origin.y - box.size.height) * static_cast<double>(imageHeight));
      SetDouble(env, item, "pixelWidth", box.size.width * static_cast<double>(imageWidth));
      SetDouble(env, item, "pixelHeight", box.size.height * static_cast<double>(imageHeight));
      ArrayPush(env, observations, item);
      observationCount += 1;
    }

    NSString *joinedText = JoinNSStringParts(textParts);
    napi_value result;
    napi_create_object(env, &result);
    SetBool(env, result, "ok", true);
    SetString(env, result, "source", "apple_vision");
    SetString(env, result, "text", joinedText.UTF8String);
    SetDouble(env, result, "imageWidth", static_cast<double>(imageWidth));
    SetDouble(env, result, "imageHeight", static_cast<double>(imageHeight));
    SetInt(env, result, "observationCount", observationCount);
    napi_set_named_property(env, result, "observations", observations);
    [request release];
    return result;
  }
}

napi_value PreflightScreenCapture(napi_env env, napi_callback_info info) {
  return BooleanResult(env, CGPreflightScreenCaptureAccess());
}

napi_value IsAccessibilityTrusted(napi_env env, napi_callback_info info) {
  return BooleanResult(env, AXIsProcessTrusted());
}

napi_value MoveMouse(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double x = 0;
  double y = 0;
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    napi_throw_error(env, nullptr, "moveMouse requires { x, y }.");
    return nullptr;
  }
  PostMouseEvent(kCGEventMouseMoved, CGPointMake(x, y));
  return BooleanResult(env, true);
}

napi_value MouseDown(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double x = 0;
  double y = 0;
  std::string button = "left";
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    napi_throw_error(env, nullptr, "mouseDown requires { x, y }.");
    return nullptr;
  }
  GetNamedString(env, args[0], "button", &button);
  PostMouseEvent(MouseDownType(button), CGPointMake(x, y), button);
  return BooleanResult(env, true);
}

napi_value MouseUp(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double x = 0;
  double y = 0;
  std::string button = "left";
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    napi_throw_error(env, nullptr, "mouseUp requires { x, y }.");
    return nullptr;
  }
  GetNamedString(env, args[0], "button", &button);
  PostMouseEvent(MouseUpType(button), CGPointMake(x, y), button);
  return BooleanResult(env, true);
}

napi_value ClickMouse(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double x = 0;
  double y = 0;
  double clicksRaw = 1;
  std::string button = "left";
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    napi_throw_error(env, nullptr, "clickMouse requires { x, y }.");
    return nullptr;
  }
  GetNamedDouble(env, args[0], "clicks", &clicksRaw);
  GetNamedString(env, args[0], "button", &button);
  int clicks = std::max(1, std::min(3, static_cast<int>(clicksRaw)));
  CGPoint point = CGPointMake(x, y);
  for (int i = 0; i < clicks; i += 1) {
    PostMouseEvent(MouseDownType(button), point, button, clicks);
    std::this_thread::sleep_for(std::chrono::milliseconds(35));
    PostMouseEvent(MouseUpType(button), point, button, clicks);
    if (clicks > 1) std::this_thread::sleep_for(std::chrono::milliseconds(45));
  }
  return BooleanResult(env, true);
}

napi_value DragMouse(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_error(env, nullptr, "dragMouse requires { path }.");
    return nullptr;
  }
  std::string button = "left";
  GetNamedString(env, args[0], "button", &button);
  bool hasPath = false;
  napi_has_named_property(env, args[0], "path", &hasPath);
  if (!hasPath) {
    napi_throw_error(env, nullptr, "dragMouse requires a path array.");
    return nullptr;
  }
  napi_value pathValue;
  napi_get_named_property(env, args[0], "path", &pathValue);
  bool isArray = false;
  napi_is_array(env, pathValue, &isArray);
  if (!isArray) {
    napi_throw_error(env, nullptr, "dragMouse path must be an array.");
    return nullptr;
  }
  uint32_t length = 0;
  napi_get_array_length(env, pathValue, &length);
  if (length < 2) return BooleanResult(env, false);
  std::vector<CGPoint> points;
  for (uint32_t i = 0; i < length; i += 1) {
    napi_value item;
    napi_get_element(env, pathValue, i, &item);
    double x = 0;
    double y = 0;
    if (!GetNamedDouble(env, item, "x", &x) || !GetNamedDouble(env, item, "y", &y)) continue;
    points.push_back(CGPointMake(x, y));
  }
  if (points.size() < 2) return BooleanResult(env, false);
  PostMouseEvent(MouseDownType(button), points.front(), button);
  std::this_thread::sleep_for(std::chrono::milliseconds(80));
  for (const CGPoint &point : points) {
    PostMouseEvent(MouseDraggedType(button), point, button);
    std::this_thread::sleep_for(std::chrono::milliseconds(16));
  }
  PostMouseEvent(MouseUpType(button), points.back(), button);
  return BooleanResult(env, true);
}

napi_value ScrollWheel(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  double deltaX = 0;
  double deltaY = 0;
  if (argc < 1) {
    napi_throw_error(env, nullptr, "scrollWheel requires { deltaX?, deltaY? }.");
    return nullptr;
  }
  GetNamedDouble(env, args[0], "deltaX", &deltaX);
  GetNamedDouble(env, args[0], "deltaY", &deltaY);
  CGEventRef event = CGEventCreateScrollWheelEvent(nullptr, kCGScrollEventUnitPixel, 2, static_cast<int32_t>(deltaY), static_cast<int32_t>(deltaX));
  CGEventPost(kCGHIDEventTap, event);
  CFRelease(event);
  return BooleanResult(env, true);
}

napi_value KeyPress(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_error(env, nullptr, "keyPress requires a key string or string array.");
    return nullptr;
  }

  std::vector<std::string> keys;
  bool isArray = false;
  napi_is_array(env, args[0], &isArray);
  if (isArray) {
    uint32_t length = 0;
    napi_get_array_length(env, args[0], &length);
    for (uint32_t i = 0; i < length; i += 1) {
      napi_value item;
      napi_get_element(env, args[0], i, &item);
      size_t lengthUtf8 = 0;
      napi_get_value_string_utf8(env, item, nullptr, 0, &lengthUtf8);
      std::vector<char> buffer(lengthUtf8 + 1);
      napi_get_value_string_utf8(env, item, buffer.data(), buffer.size(), &lengthUtf8);
      keys.push_back(std::string(buffer.data(), lengthUtf8));
    }
  } else {
    size_t lengthUtf8 = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &lengthUtf8);
    std::vector<char> buffer(lengthUtf8 + 1);
    napi_get_value_string_utf8(env, args[0], buffer.data(), buffer.size(), &lengthUtf8);
    keys.push_back(std::string(buffer.data(), lengthUtf8));
  }

  CGEventFlags flags = 0;
  std::vector<CGKeyCode> normalKeys;
  for (const std::string &key : keys) {
    CGEventFlags flag = ModifierFlagForName(key);
    if (flag) {
      flags |= flag;
      continue;
    }
    CGKeyCode code = 0;
    if (KeyCodeForName(key, &code)) normalKeys.push_back(code);
  }
  if (normalKeys.empty()) return BooleanResult(env, false);

  for (CGKeyCode code : normalKeys) {
    PostKeyboardEvent(code, true, flags);
    std::this_thread::sleep_for(std::chrono::milliseconds(25));
    PostKeyboardEvent(code, false, flags);
  }
  return BooleanResult(env, true);
}

napi_value TypeText(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_error(env, nullptr, "typeText requires a string.");
    return nullptr;
  }
  size_t length = 0;
  napi_get_value_string_utf8(env, args[0], nullptr, 0, &length);
  std::vector<char> buffer(length + 1);
  napi_get_value_string_utf8(env, args[0], buffer.data(), buffer.size(), &length);
  std::string utf8(buffer.data(), length);
  NSString *string = [[NSString alloc] initWithBytes:utf8.data() length:utf8.size() encoding:NSUTF8StringEncoding];
  for (NSUInteger i = 0; i < [string length]; i += 1) {
    unichar ch = [string characterAtIndex:i];
    CGEventRef down = CGEventCreateKeyboardEvent(nullptr, 0, true);
    CGEventKeyboardSetUnicodeString(down, 1, &ch);
    CGEventPost(kCGHIDEventTap, down);
    CFRelease(down);
    CGEventRef up = CGEventCreateKeyboardEvent(nullptr, 0, false);
    CGEventKeyboardSetUnicodeString(up, 1, &ch);
    CGEventPost(kCGHIDEventTap, up);
    CFRelease(up);
    std::this_thread::sleep_for(std::chrono::milliseconds(3));
  }
  [string release];
  return BooleanResult(env, true);
}

napi_value DescribeElementAtPoint(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

  napi_value result;
  napi_create_object(env, &result);
  SetBool(env, result, "found", false);

  double x = 0;
  double y = 0;
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    SetString(env, result, "error", "describeElementAtPoint requires { x, y }.");
    return result;
  }
  if (!AXIsProcessTrusted()) {
    SetString(env, result, "error", "Accessibility is not trusted.");
    return result;
  }

  AXUIElementRef systemWide = AXUIElementCreateSystemWide();
  AXUIElementRef element = nullptr;
  AXError error = AXUIElementCopyElementAtPosition(systemWide, static_cast<float>(x), static_cast<float>(y), &element);
  if (systemWide) CFRelease(systemWide);
  if (error != kAXErrorSuccess || !element) {
    SetInt(env, result, "errorCode", static_cast<int32_t>(error));
    return result;
  }

  SetBool(env, result, "found", true);
  SetInt(env, result, "x", static_cast<int32_t>(std::round(x)));
  SetInt(env, result, "y", static_cast<int32_t>(std::round(y)));

  const std::string role = AXStringAttribute(element, kAXRoleAttribute);
  const std::string roleDescription = AXStringAttribute(element, kAXRoleDescriptionAttribute);
  const std::string title = AXStringAttribute(element, kAXTitleAttribute);
  const std::string description = AXStringAttribute(element, kAXDescriptionAttribute);
  const std::string help = AXStringAttribute(element, kAXHelpAttribute);
  const std::string value = AXStringAttribute(element, kAXValueAttribute);
  const std::string identifier = AXStringAttribute(element, CFSTR("AXIdentifier"));

  SetString(env, result, "role", role.c_str());
  SetString(env, result, "roleDescription", roleDescription.c_str());
  SetString(env, result, "title", title.c_str());
  SetString(env, result, "description", description.c_str());
  SetString(env, result, "help", help.c_str());
  SetString(env, result, "value", value.c_str());
  SetString(env, result, "identifier", identifier.c_str());

  CFRelease(element);
  return result;
}

napi_value PerformActionAtPoint(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

  napi_value result;
  napi_create_object(env, &result);
  SetBool(env, result, "ok", false);
  SetBool(env, result, "found", false);

  double x = 0;
  double y = 0;
  if (argc < 1 || !GetNamedDouble(env, args[0], "x", &x) || !GetNamedDouble(env, args[0], "y", &y)) {
    SetString(env, result, "error", "performActionAtPoint requires { x, y }.");
    return result;
  }
  if (!AXIsProcessTrusted()) {
    SetString(env, result, "error", "Accessibility is not trusted.");
    return result;
  }

  AXUIElementRef systemWide = AXUIElementCreateSystemWide();
  AXUIElementRef element = nullptr;
  AXError lookupError = AXUIElementCopyElementAtPosition(systemWide, static_cast<float>(x), static_cast<float>(y), &element);
  if (systemWide) CFRelease(systemWide);
  if (lookupError != kAXErrorSuccess || !element) {
    SetInt(env, result, "errorCode", static_cast<int32_t>(lookupError));
    return result;
  }

  SetBool(env, result, "found", true);
  SetInt(env, result, "x", static_cast<int32_t>(std::round(x)));
  SetInt(env, result, "y", static_cast<int32_t>(std::round(y)));

  AXUIElementRef current = element;
  CFRetain(current);
  AXError actionError = kAXErrorCannotComplete;
  for (int depth = 0; current && depth < 5; depth += 1) {
    const std::string role = AXStringAttribute(current, kAXRoleAttribute);
    const std::string title = AXStringAttribute(current, kAXTitleAttribute);
    if (depth == 0) {
      SetString(env, result, "role", role.c_str());
      SetString(env, result, "title", title.c_str());
    }

    CFArrayRef actionNames = nullptr;
    AXUIElementCopyActionNames(current, &actionNames);
    bool supportsPress = false;
    if (actionNames) {
      CFIndex count = CFArrayGetCount(actionNames);
      for (CFIndex index = 0; index < count; index += 1) {
        CFStringRef actionName = static_cast<CFStringRef>(CFArrayGetValueAtIndex(actionNames, index));
        if (actionName && CFStringCompare(actionName, kAXPressAction, 0) == kCFCompareEqualTo) {
          supportsPress = true;
          break;
        }
      }
      CFRelease(actionNames);
    }

    if (supportsPress) {
      actionError = AXUIElementPerformAction(current, kAXPressAction);
      if (actionError == kAXErrorSuccess) {
        SetBool(env, result, "ok", true);
        SetString(env, result, "performedAction", "AXPress");
        SetInt(env, result, "performedDepth", depth);
        CFRelease(current);
        CFRelease(element);
        return result;
      }
    }

    CFTypeRef parentValue = nullptr;
    AXError parentError = AXUIElementCopyAttributeValue(current, kAXParentAttribute, &parentValue);
    CFRelease(current);
    current = nullptr;
    if (parentError != kAXErrorSuccess || !parentValue || CFGetTypeID(parentValue) != AXUIElementGetTypeID()) {
      if (parentValue) CFRelease(parentValue);
      break;
    }
    current = static_cast<AXUIElementRef>(parentValue);
  }

  SetInt(env, result, "errorCode", static_cast<int32_t>(actionError));
  if (current) CFRelease(current);
  CFRelease(element);
  return result;
}

napi_value StartShortcutMonitor(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 2) {
    napi_throw_error(env, nullptr, "startShortcutMonitor requires a config object and callback.");
    return nullptr;
  }

  napi_valuetype callbackType;
  napi_typeof(env, args[1], &callbackType);
  if (callbackType != napi_function) {
    napi_throw_error(env, nullptr, "startShortcutMonitor callback must be a function.");
    return nullptr;
  }

  std::string key = "M";
  GetNamedString(env, args[0], "key", &key);
  CGKeyCode parsedKey = kVK_ANSI_M;
  if (!KeyCodeForName(key, &parsedKey)) {
    napi_throw_error(env, nullptr, "Unsupported shortcut key.");
    return nullptr;
  }

  CGEventFlags parsedFlags = 0;
  bool hasModifiers = false;
  napi_has_named_property(env, args[0], "modifiers", &hasModifiers);
  if (hasModifiers) {
    napi_value modifiersValue;
    napi_get_named_property(env, args[0], "modifiers", &modifiersValue);
    bool isArray = false;
    napi_is_array(env, modifiersValue, &isArray);
    if (isArray) {
      uint32_t length = 0;
      napi_get_array_length(env, modifiersValue, &length);
      for (uint32_t i = 0; i < length; i += 1) {
        napi_value item;
        napi_get_element(env, modifiersValue, i, &item);
        size_t lengthUtf8 = 0;
        napi_get_value_string_utf8(env, item, nullptr, 0, &lengthUtf8);
        std::vector<char> buffer(lengthUtf8 + 1);
        napi_get_value_string_utf8(env, item, buffer.data(), buffer.size(), &lengthUtf8);
        parsedFlags |= ModifierFlagForName(std::string(buffer.data(), lengthUtf8));
      }
    }
  }
  if (!parsedFlags) parsedFlags = kCGEventFlagMaskAlternate;

  StopShortcutMonitorInternal();

  napi_value resourceName;
  napi_create_string_utf8(env, "OpenArgosShortcutMonitor", NAPI_AUTO_LENGTH, &resourceName);
  napi_status tsfnStatus = napi_create_threadsafe_function(
    env,
    args[1],
    nullptr,
    resourceName,
    0,
    1,
    nullptr,
    nullptr,
    nullptr,
    ShortcutJsCallback,
    &shortcutCallback
  );
  if (tsfnStatus != napi_ok || !shortcutCallback) {
    return BooleanResult(env, false);
  }

  shortcutKeyCode = parsedKey;
  shortcutRequiredFlags = parsedFlags;
  shortcutIsDown = false;

  const CGEventMask mask = CGEventMaskBit(kCGEventKeyDown) |
    CGEventMaskBit(kCGEventKeyUp) |
    CGEventMaskBit(kCGEventFlagsChanged);

  shortcutEventTap = CGEventTapCreate(
    kCGSessionEventTap,
    kCGHeadInsertEventTap,
    kCGEventTapOptionDefault,
    mask,
    ShortcutEventCallback,
    nullptr
  );

  if (!shortcutEventTap) {
    StopShortcutMonitorInternal();
    return BooleanResult(env, false);
  }

  shortcutRunLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, shortcutEventTap, 0);
  if (!shortcutRunLoopSource) {
    StopShortcutMonitorInternal();
    return BooleanResult(env, false);
  }

  CFRunLoopAddSource(CFRunLoopGetMain(), shortcutRunLoopSource, kCFRunLoopCommonModes);
  CGEventTapEnable(shortcutEventTap, true);
  return BooleanResult(env, true);
}

napi_value StopShortcutMonitor(napi_env env, napi_callback_info info) {
  StopShortcutMonitorInternal();
  return BooleanResult(env, true);
}

napi_value StartVoiceCapture(napi_env env, napi_callback_info info) {
  if (!EnsureMicrophoneAccess()) {
    return ErrorObject(env, "microphone_blocked", "Microphone access is blocked.");
  }

  StopVoiceRecorderInternal();

  NSString *fileName = [NSString stringWithFormat:@"openargos-voice-%@.m4a", [[NSUUID UUID] UUIDString]];
  NSString *filePath = [NSTemporaryDirectory() stringByAppendingPathComponent:fileName];
  NSURL *url = [[NSURL fileURLWithPath:filePath] retain];
  NSDictionary *settings = @{
    AVFormatIDKey: @(kAudioFormatMPEG4AAC),
    AVSampleRateKey: @48000.0,
    AVNumberOfChannelsKey: @1,
    AVEncoderAudioQualityKey: @(AVAudioQualityHigh)
  };

  NSError *error = nil;
  AVAudioRecorder *recorder = [[AVAudioRecorder alloc] initWithURL:url settings:settings error:&error];
  if (!recorder || error) {
    if (recorder) [recorder release];
    [url release];
    NSString *message = error.localizedDescription ?: @"Could not create the native voice capture file.";
    return ErrorObject(env, "native_voice_start_failed", message.UTF8String);
  }

  recorder.meteringEnabled = YES;
  [recorder prepareToRecord];
  if (![recorder record]) {
    [recorder release];
    [url release];
    return ErrorObject(env, "native_voice_start_failed", "Could not start native voice capture.");
  }

  voiceRecorder = recorder;
  voiceRecordingURL = url;
  voiceRecordingStartedAt = [[NSDate date] retain];
  StartVoiceMeterTimer();

  napi_value result;
  napi_create_object(env, &result);
  SetBool(env, result, "ok", true);
  SetString(env, result, "path", filePath.UTF8String);
  SetString(env, result, "mimeType", "audio/m4a");
  SetString(env, result, "inputDeviceName", CurrentAudioInputDeviceName().UTF8String);
  return result;
}

napi_value StopVoiceCapture(napi_env env, napi_callback_info info) {
  if (!voiceRecorder || !voiceRecordingURL) {
    return ErrorObject(env, "native_voice_not_recording", "Voice is not recording.");
  }

  NSTimeInterval durationSeconds = voiceRecordingStartedAt ? [[NSDate date] timeIntervalSinceDate:voiceRecordingStartedAt] : 0;
  NSURL *url = [voiceRecordingURL retain];
  SampleVoiceMeter();
  StopVoiceMeterTimer();
  float maxAveragePower = voiceRecordingMaxAveragePower;
  float maxPeakPower = voiceRecordingMaxPeakPower;
  uint32_t meterSamples = voiceRecordingMeterSamples;
  [voiceRecorder stop];
  [voiceRecorder release];
  voiceRecorder = nil;
  if (voiceRecordingURL) {
    [voiceRecordingURL release];
    voiceRecordingURL = nil;
  }
  if (voiceRecordingStartedAt) {
    [voiceRecordingStartedAt release];
    voiceRecordingStartedAt = nil;
  }

  NSString *path = [url path];
  NSDictionary *attributes = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:nil];
  unsigned long long bytes = attributes ? [[attributes objectForKey:NSFileSize] unsignedLongLongValue] : 0;

  napi_value result;
  napi_create_object(env, &result);
  SetBool(env, result, "ok", true);
  SetString(env, result, "path", path.UTF8String);
  SetString(env, result, "mimeType", "audio/m4a");
  SetDouble(env, result, "durationMs", durationSeconds * 1000.0);
  SetDouble(env, result, "bytes", static_cast<double>(bytes));
  SetDouble(env, result, "maxAveragePower", static_cast<double>(maxAveragePower));
  SetDouble(env, result, "maxPeakPower", static_cast<double>(maxPeakPower));
  SetDouble(env, result, "maxAverageLevel", AudioPowerToLinear(maxAveragePower));
  SetDouble(env, result, "maxPeakLevel", AudioPowerToLinear(maxPeakPower));
  SetDouble(env, result, "meterSamples", static_cast<double>(meterSamples));
  SetString(env, result, "inputDeviceName", CurrentAudioInputDeviceName().UTF8String);
  ResetVoiceMeterStats();
  [url release];
  return result;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
    {"preflightScreenCapture", nullptr, PreflightScreenCapture, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"captureAccessibilityText", nullptr, CaptureAccessibilityText, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"recognizeTextInImage", nullptr, RecognizeTextInImage, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"isAccessibilityTrusted", nullptr, IsAccessibilityTrusted, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"moveMouse", nullptr, MoveMouse, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"mouseDown", nullptr, MouseDown, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"mouseUp", nullptr, MouseUp, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"clickMouse", nullptr, ClickMouse, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"dragMouse", nullptr, DragMouse, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"scrollWheel", nullptr, ScrollWheel, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"keyPress", nullptr, KeyPress, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"typeText", nullptr, TypeText, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"describeElementAtPoint", nullptr, DescribeElementAtPoint, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"performActionAtPoint", nullptr, PerformActionAtPoint, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"startShortcutMonitor", nullptr, StartShortcutMonitor, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"stopShortcutMonitor", nullptr, StopShortcutMonitor, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"startVoiceCapture", nullptr, StartVoiceCapture, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"stopVoiceCapture", nullptr, StopVoiceCapture, nullptr, nullptr, nullptr, napi_default, nullptr}
  };
  napi_define_properties(env, exports, sizeof(properties) / sizeof(properties[0]), properties);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
