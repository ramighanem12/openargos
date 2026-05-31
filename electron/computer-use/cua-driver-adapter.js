"use strict";

const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

const runExecFile = promisify(execFile);

const defaultTimeoutMs = 8000;
const screenshotTimeoutMs = 30000;
const hostAppNameBlocklist = /\b(openargos|openargos ambient|openargos background browser|systemuiserver|windowserver|dock)\b/i;

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value = "", limit = 240) {
  const text = normalizeText(value);
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
}

function parseJsonText(value = "") {
  try {
    return JSON.parse(String(value || "").trim());
  } catch {
    return null;
  }
}

function structuredOutput(payload = {}) {
  if (!payload || typeof payload !== "object") return {};
  return payload.structured_content ||
    payload.structuredContent ||
    payload.structured ||
    payload.data ||
    payload;
}

function contentText(payload = {}) {
  const content = Array.isArray(payload?.content) ? payload.content : [];
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item?.text === "string") return item.text;
      if (typeof item?.value === "string") return item.value;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function imageBase64FromPayload(payload = {}) {
  const structured = structuredOutput(payload);
  if (typeof structured.screenshot_png_b64 === "string") return structured.screenshot_png_b64;
  if (typeof structured.screenshot_base64 === "string") return structured.screenshot_base64;
  if (typeof structured.image_base64 === "string") return structured.image_base64;
  const content = Array.isArray(payload?.content) ? payload.content : [];
  for (const item of content) {
    if (typeof item?.image_png_b64 === "string") return item.image_png_b64;
    if (typeof item?.data === "string" && /image/i.test(String(item?.mimeType || item?.mime_type || ""))) return item.data;
    if (typeof item?.image_url === "string" && item.image_url.startsWith("data:image/")) {
      const match = item.image_url.match(/^data:image\/[^;,]+;base64,(.+)$/);
      if (match) return match[1];
    }
  }
  return "";
}

function pngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function normalizeCuaKey(key = "") {
  const value = String(key || "").trim();
  if (!value) return "";
  const upper = value.toUpperCase();
  const map = {
    COMMAND: "cmd",
    CMD: "cmd",
    META: "cmd",
    CONTROL: "ctrl",
    CTRL: "ctrl",
    ALT: "option",
    OPTION: "option",
    SHIFT: "shift",
    RETURN: "return",
    ENTER: "return",
    ESC: "escape",
    ESCAPE: "escape",
    SPACE: "space",
    BACKSPACE: "delete",
    DELETE: "delete",
    UP: "up",
    ARROWUP: "up",
    DOWN: "down",
    ARROWDOWN: "down",
    LEFT: "left",
    ARROWLEFT: "left",
    RIGHT: "right",
    ARROWRIGHT: "right",
    HOME: "home",
    END: "end",
    PAGEUP: "pageup",
    PAGEDOWN: "pagedown"
  };
  return map[upper] || value.toLowerCase();
}

function normalizeActionType(action = {}) {
  return String(action?.type || "").toLowerCase().replace(/-/g, "_");
}

function normalizedActionKeys(action = {}) {
  return (Array.isArray(action.keys) ? action.keys : [action.key || action.text].filter(Boolean))
    .flatMap((key) => String(key || "").split("+"))
    .map((key) => String(key || "").trim())
    .filter(Boolean);
}

function normalizeButton(button = "") {
  const value = String(button || "left").toLowerCase();
  if (value === "right" || value === "secondary") return "right";
  if (value === "middle" || value === "wheel") return "middle";
  return "left";
}

function scoreWindow(window = {}, context = {}) {
  const appName = normalizeText(window.app_name || window.appName || window.app || "");
  const title = normalizeText(window.title || "");
  if (!appName || hostAppNameBlocklist.test(appName)) return -10000;
  const desiredApp = normalizeText(context.activeApp || context.appName || "");
  const desiredTitle = normalizeText(context.activeWindowTitle || context.browserTitle || "");
  let score = 0;
  if (desiredApp && !hostAppNameBlocklist.test(desiredApp)) {
    const a = appName.toLowerCase();
    const d = desiredApp.toLowerCase();
    if (a === d) score += 120;
    else if (a.includes(d) || d.includes(a)) score += 80;
  }
  if (desiredTitle) {
    const t = title.toLowerCase();
    const d = desiredTitle.toLowerCase();
    if (t && t === d) score += 80;
    else if (t && (t.includes(d.slice(0, 48)) || d.includes(t.slice(0, 48)))) score += 44;
  }
  if (window.on_current_space) score += 20;
  if (window.is_on_screen) score += 10;
  score += Math.max(-1000, Math.min(1000, Number(window.z_index || 0))) / 100;
  const bounds = window.bounds || {};
  const area = Number(bounds.width || 0) * Number(bounds.height || 0);
  if (area < 1600) score -= 30;
  return score;
}

function chooseWindow(windows = [], context = {}) {
  const candidates = (Array.isArray(windows) ? windows : [])
    .filter((window) => window && Number.isFinite(Number(window.pid)) && Number.isFinite(Number(window.window_id)))
    .map((window) => ({
      ...window,
      _score: scoreWindow(window, context)
    }))
    .filter((window) => window._score > -1000)
    .sort((a, b) => b._score - a._score);
  return candidates[0] || null;
}

function appNameMentionedInTask(appName = "", task = "") {
  const name = normalizeText(appName).toLowerCase();
  const text = normalizeText(task).toLowerCase();
  if (!name || !text || hostAppNameBlocklist.test(name)) return false;
  if (name.length < 3) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)) return true;
  const compact = name.replace(/\s+/g, "");
  if (compact.length >= 5 && text.replace(/\s+/g, "").includes(compact)) return true;
  return false;
}

function captureFilePath() {
  return path.join(os.tmpdir(), `openargos-cua-driver-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`);
}

function targetFromWindow(window = {}) {
  const bounds = window.bounds || {};
  return {
    pid: Number(window.pid),
    windowId: Number(window.window_id),
    appName: normalizeText(window.app_name || window.appName || ""),
    title: normalizeText(window.title || ""),
    bounds: {
      x: Number(bounds.x || 0),
      y: Number(bounds.y || 0),
      width: Number(bounds.width || 0),
      height: Number(bounds.height || 0)
    },
    onCurrentSpace: Boolean(window.on_current_space),
    isOnScreen: Boolean(window.is_on_screen)
  };
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function expandHomePath(value = "") {
  const text = String(value || "").trim();
  if (!text.startsWith("~/")) return text;
  return path.join(os.homedir(), text.slice(2));
}

function defaultBinaryCandidates(binary = "") {
  return uniqueValues([
    process.env.OPENARGOS_CUA_DRIVER_PATH,
    binary,
    "cua-driver",
    "~/.local/bin/cua-driver",
    "/opt/homebrew/bin/cua-driver",
    "/usr/local/bin/cua-driver",
    "/Applications/CuaDriver.app/Contents/MacOS/cua-driver",
    "/Applications/CuaDriver.app/Contents/MacOS/CuaDriver"
  ]).map(expandHomePath);
}

function createCuaDriverUnavailableError(details = {}) {
  const candidates = Array.isArray(details.candidates) ? details.candidates : [];
  const message = [
    "Cua Driver is selected, but OpenArgos could not find the cua-driver executable.",
    "Install Cua Driver, then restart OpenArgos.",
    "Expected locations include ~/.local/bin/cua-driver and /Applications/CuaDriver.app."
  ].join(" ");
  const error = new Error(message);
  error.code = "CUA_DRIVER_UNAVAILABLE";
  error.details = {
    candidates,
    errors: details.errors || []
  };
  return error;
}

function createCuaDriverAdapterFactory({
  binary = process.env.OPENARGOS_CUA_DRIVER_PATH || "cua-driver",
  enabled = process.env.OPENARGOS_COMPUTER_USE_CUA_DRIVER !== "0",
  execFileImpl = runExecFile,
  getApiKey,
  taskTargetsOpenArgosApp,
  log,
  truncateText = truncate
} = {}) {
  const logger = typeof log === "function" ? log : () => {};
  const binaryCandidates = defaultBinaryCandidates(binary);
  let resolvedBinary = "";
  let availabilityPromise = null;

  async function execJson(args = [], options = {}) {
    const timeout = Number(options.timeoutMs || defaultTimeoutMs);
    const executable = await resolveBinary();
    const { stdout } = await execFileImpl(executable, args, {
      timeout,
      maxBuffer: 12 * 1024 * 1024,
      env: cuaDriverEnv(),
      windowsHide: true
    });
    return parseJsonText(stdout) || {};
  }

  async function resolveBinary() {
    if (!enabled) return false;
    if (resolvedBinary) return resolvedBinary;
    if (!availabilityPromise) {
      availabilityPromise = (async () => {
        const errors = [];
        for (const candidate of binaryCandidates) {
          try {
            await execFileImpl(candidate, ["list-tools"], {
              timeout: 1800,
              maxBuffer: 1024 * 1024,
              env: cuaDriverEnv(),
              windowsHide: true
            });
            resolvedBinary = candidate;
            logger("computer_use_cua_driver_available", { binary: candidate });
            return candidate;
          } catch (error) {
            errors.push({
              binary: candidate,
              message: error?.message || String(error || ""),
              code: error?.code || error?.cause?.code || null
            });
          }
        }
        logger("computer_use_cua_driver_unavailable", {
          candidates: binaryCandidates,
          errors
        });
        throw createCuaDriverUnavailableError({ candidates: binaryCandidates, errors });
      })();
    }
    return await availabilityPromise;
  }

  async function isAvailable() {
    if (!enabled) return false;
    try {
      return Boolean(await resolveBinary());
    } catch {
      return false;
    }
  }

  async function callTool(name, args = {}, options = {}) {
    const payload = await execJson(["call", name, JSON.stringify(args || {})], options);
    if (payload?.is_error || payload?.isError) {
      throw new Error(contentText(payload) || payload?.error || `${name} failed`);
    }
    return payload;
  }

  function cuaDriverEnv() {
    const apiKey = typeof getApiKey === "function" ? String(getApiKey() || "").trim() : "";
    return {
      ...process.env,
      ...(apiKey ? { CUA_API_KEY: apiKey } : {})
    };
  }

  async function listWindows() {
    const payload = await callTool("list_windows", {}, { timeoutMs: 3500 });
    const structured = structuredOutput(payload);
    return Array.isArray(structured.windows) ? structured.windows : [];
  }

  async function listApps() {
    const payload = await callTool("list_apps", {}, { timeoutMs: 5000 });
    const structured = structuredOutput(payload);
    return Array.isArray(structured.apps) ? structured.apps : [];
  }

  async function findMentionedApp(task = "") {
    const apps = await listApps();
    return apps
      .filter((app) => appNameMentionedInTask(app.name, task))
      .sort((a, b) => Number(Boolean(b.running)) - Number(Boolean(a.running)) || String(a.name || "").length - String(b.name || "").length)[0] || null;
  }

  async function launchMentionedApp(task = "", mentionedApp = null) {
    const match = mentionedApp || await findMentionedApp(task);
    if (!match?.name) return null;
    const payload = await callTool("launch_app", { name: match.name }, { timeoutMs: 8000 });
    const structured = structuredOutput(payload);
    const windows = Array.isArray(structured.windows) ? structured.windows : [];
    return {
      appName: match.name,
      windows
    };
  }

  function shouldUse(task = "", plan = {}, context = {}) {
    if (!enabled) return false;
    if (!plan || plan.kind !== "native") return false;
    if (typeof taskTargetsOpenArgosApp === "function" && taskTargetsOpenArgosApp(task)) return false;
    if (context?.forceNativeAdapter) return false;
    return true;
  }

  async function selectTarget(context = {}) {
    const windows = await listWindows();
    const mentionedApp = await findMentionedApp(context.task || "").catch(() => null);
    if (mentionedApp?.name) {
      const mentionedWindow = chooseWindow(windows, { ...context, activeApp: mentionedApp.name, activeWindowTitle: "" });
      if (mentionedWindow) return targetFromWindow(mentionedWindow);
      const launched = await launchMentionedApp(context.task || "", mentionedApp).catch((error) => {
        logger("computer_use_cua_driver_launch_app_failed", {
          task: truncateText(context.task || "", 160),
          appName: mentionedApp.name,
          message: error?.message || String(error || "")
        });
        return null;
      });
      if (launched) {
        const launchedWindow = chooseWindow(launched.windows, { ...context, activeApp: launched.appName, activeWindowTitle: "" }) ||
          chooseWindow(await listWindows(), { ...context, activeApp: launched.appName, activeWindowTitle: "" });
        if (launchedWindow) return targetFromWindow(launchedWindow);
      }
    }
    const chosen = chooseWindow(windows, context);
    if (chosen) return targetFromWindow(chosen);
    return null;
  }

  async function maybeCreateAdapter(task = "", plan = {}, context = {}) {
    if (!shouldUse(task, plan, context)) return null;
    await resolveBinary();
    const target = await selectTarget({ ...context, ...plan, task }).catch((error) => {
      logger("computer_use_cua_driver_target_failed", {
        message: error?.message || String(error || "")
      });
      return null;
    });
    if (!target) {
      logger("computer_use_cua_driver_no_target", {
        task: truncateText(task, 160),
        activeApp: plan.activeApp || context.activeApp || "",
        activeWindowTitle: plan.activeWindowTitle || context.activeWindowTitle || ""
      });
      return null;
    }
    return createAdapter({ task, plan, context, target });
  }

  function createAdapter({ task = "", plan = {}, context = {}, target }) {
    let currentTarget = target;
    let lastCapture = null;

    async function ensureTarget() {
      if (currentTarget) return currentTarget;
      currentTarget = await selectTarget({ ...context, ...plan, task });
      if (!currentTarget) throw new Error("Cua Driver could not identify a target app window.");
      return currentTarget;
    }

    async function getWindowState({ captureMode = "som" } = {}) {
      const target = await ensureTarget();
      const outputPath = captureMode === "ax" ? "" : captureFilePath();
      const args = {
        pid: target.pid,
        window_id: target.windowId,
        capture_mode: captureMode
      };
      if (outputPath) args.screenshot_out_file = outputPath;
      const payload = await callTool("get_window_state", args, { timeoutMs: screenshotTimeoutMs });
      const structured = structuredOutput(payload);
      let pngBuffer = null;
      if (outputPath && fs.existsSync(outputPath)) {
        pngBuffer = fs.readFileSync(outputPath);
        fs.rmSync(outputPath, { force: true });
      } else {
        const b64 = imageBase64FromPayload(payload);
        if (b64) pngBuffer = Buffer.from(b64, "base64");
      }
      const dims = pngDimensions(pngBuffer) || {
        width: Number(structured.screenshot_width || structured.width || target.bounds.width || 1),
        height: Number(structured.screenshot_height || structured.height || target.bounds.height || 1)
      };
      const treeMarkdown = String(structured.tree_markdown || structured.treeMarkdown || contentText(payload) || "").trim();
      return {
        payload,
        structured,
        pngBuffer,
        width: Math.max(1, Number(dims.width || 1)),
        height: Math.max(1, Number(dims.height || 1)),
        treeMarkdown
      };
    }

    function focusContextFromState(state = {}) {
      const target = currentTarget || {};
      return {
        activeApp: target.appName || "Cua Driver target",
        activeWindowTitle: target.title || "",
        browserTitle: "",
        browserUrl: "",
        visibleText: truncateText(state.treeMarkdown || "", 7000),
        pageSummary: state.treeMarkdown ? `Cua Driver window map:\n${truncateText(state.treeMarkdown, 2600)}` : "",
        cuaDriver: {
          pid: target.pid || null,
          windowId: target.windowId || null,
          appName: target.appName || "",
          title: target.title || ""
        },
        windowFrame: {
          x: target.bounds?.x || 0,
          y: target.bounds?.y || 0,
          width: target.bounds?.width || state.width || 1,
          height: target.bounds?.height || state.height || 1
        }
      };
    }

    function actionPoint(action = {}) {
      return {
        x: Number.isFinite(Number(action.x)) ? Number(action.x) : Math.round((lastCapture?.image?.width || 1) / 2),
        y: Number.isFinite(Number(action.y)) ? Number(action.y) : Math.round((lastCapture?.image?.height || 1) / 2)
      };
    }

    async function executeAction(action = {}) {
      const target = await ensureTarget();
      const type = normalizeActionType(action);
      if (type === "wait" || type === "screenshot" || type === "move") return;
      if (type === "click" || type === "double_click") {
        const point = actionPoint(action);
        const tool = type === "double_click" ? "double_click" : "click";
        await callTool(tool, {
          pid: target.pid,
          window_id: target.windowId,
          x: point.x,
          y: point.y,
          button: normalizeButton(action.button),
          count: Math.max(1, Math.min(3, Number(action.clicks || 1)))
        });
        return;
      }
      if (type === "drag") {
        const pathValue = Array.isArray(action.path) ? action.path : [];
        const from = pathValue[0] || { x: action.x, y: action.y };
        const to = pathValue.at(-1) || { x: action.to_x ?? action.toX, y: action.to_y ?? action.toY };
        if (!Number.isFinite(Number(from?.x)) || !Number.isFinite(Number(from?.y)) ||
            !Number.isFinite(Number(to?.x)) || !Number.isFinite(Number(to?.y))) {
          throw new Error("Cua Driver drag needs usable start and end points.");
        }
        await callTool("drag", {
          pid: target.pid,
          window_id: target.windowId,
          from_x: Number(from.x),
          from_y: Number(from.y),
          to_x: Number(to.x),
          to_y: Number(to.y),
          button: normalizeButton(action.button),
          duration_ms: Math.max(80, Math.min(1200, Number(action.duration_ms || action.duration || 360))),
          steps: 16
        });
        return;
      }
      if (type === "scroll") {
        const dy = Number(action.scroll_y ?? action.delta_y ?? action.deltaY ?? 0);
        const dx = Number(action.scroll_x ?? action.delta_x ?? action.deltaX ?? 0);
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const direction = horizontal ? (dx > 0 ? "right" : "left") : (dy < 0 ? "up" : "down");
        const amount = Math.max(1, Math.min(12, Math.round(Math.max(Math.abs(dx), Math.abs(dy), 120) / 160)));
        await callTool("scroll", {
          pid: target.pid,
          window_id: target.windowId,
          direction,
          by: amount >= 4 ? "page" : "line",
          amount
        });
        return;
      }
      if (type === "keypress") {
        const keys = normalizedActionKeys(action).map(normalizeCuaKey).filter(Boolean);
        if (!keys.length) throw new Error("Cua Driver keypress needs a key.");
        const modifiers = keys.filter((key) => ["cmd", "ctrl", "option", "shift", "fn"].includes(key));
        const nonModifiers = keys.filter((key) => !["cmd", "ctrl", "option", "shift", "fn"].includes(key));
        if (modifiers.length && nonModifiers.length) {
          await callTool("hotkey", {
            pid: target.pid,
            window_id: target.windowId,
            keys: [...modifiers, nonModifiers.at(-1)]
          });
        } else {
          await callTool("press_key", {
            pid: target.pid,
            window_id: target.windowId,
            key: nonModifiers[0] || keys.at(-1)
          });
        }
        return;
      }
      if (type === "type") {
        const text = String(action.text || "");
        if (!text) return;
        await callTool("type_text", {
          pid: target.pid,
          window_id: target.windowId,
          text,
          delay_ms: text.length > 16 ? 0 : 18
        }, { timeoutMs: Math.max(defaultTimeoutMs, Math.min(30000, 2000 + text.length * 80)) });
        return;
      }
      throw new Error(`Unsupported Cua Driver action: ${action?.type || "unknown"}.`);
    }

    return {
      kind: "cua_driver",
      label: "Cua Driver",
      background: false,
      backgroundHost: true,
      requiresScreenRecording: false,
      requiresAccessibility: false,
      verificationStrength: "medium",
      async prepare() {
        await ensureTarget();
        logger("computer_use_cua_driver_selected", {
          pid: currentTarget.pid,
          windowId: currentTarget.windowId,
          appName: currentTarget.appName,
          title: truncateText(currentTarget.title || "", 180)
        });
      },
      async getFocusContext() {
        const state = lastCapture?.cuaState || await getWindowState({ captureMode: "ax" }).catch(() => ({}));
        return focusContextFromState(state);
      },
      async capture() {
        const state = await getWindowState({ captureMode: "som" });
        if (!state.pngBuffer) throw new Error("Cua Driver did not return a screenshot for the target window.");
        const capture = {
          dataUrl: `data:image/png;base64,${state.pngBuffer.toString("base64")}`,
          image: { width: state.width, height: state.height },
          display: {
            id: `cua-driver-${currentTarget.pid}-${currentTarget.windowId}`,
            bounds: {
              x: currentTarget.bounds?.x || 0,
              y: currentTarget.bounds?.y || 0,
              width: currentTarget.bounds?.width || state.width,
              height: currentTarget.bounds?.height || state.height
            },
            workArea: {
              x: currentTarget.bounds?.x || 0,
              y: currentTarget.bounds?.y || 0,
              width: currentTarget.bounds?.width || state.width,
              height: currentTarget.bounds?.height || state.height
            },
            scaleFactor: 1
          },
          focusContext: focusContextFromState(state),
          cropped: true,
          adapter: {
            kind: "cua_driver",
            background: false,
            backgroundHost: true
          },
          cuaState: state
        };
        lastCapture = capture;
        return capture;
      },
      async describeTarget() {
        return null;
      },
      async stateFingerprint(capture = null) {
        const state = await getWindowState({ captureMode: "ax" }).catch(() => null);
        const text = state?.treeMarkdown || capture?.focusContext?.visibleText || "";
        return crypto.createHash("sha1").update(JSON.stringify({
          kind: "cua_driver",
          pid: currentTarget?.pid || "",
          windowId: currentTarget?.windowId || "",
          title: currentTarget?.title || "",
          text
        })).digest("hex");
      },
      async applyInterceptors() {
        return [];
      },
      async execute(action) {
        return await executeAction(action);
      }
    };
  }

  return {
    isAvailable,
    maybeCreateAdapter,
    _test: {
      chooseWindow,
      normalizeCuaKey,
      appNameMentionedInTask,
      structuredOutput,
      contentText,
      pngDimensions,
      defaultBinaryCandidates
    }
  };
}

module.exports = {
  createCuaDriverAdapterFactory
};
