const status = document.querySelector("[data-status]");
const log = document.querySelector("[data-log]");
const card = document.querySelector(".ambient-card");
const body = document.querySelector(".ambient-body");
const actions = document.querySelector("[data-actions]");
const closeButton = document.querySelector("[data-close]");
const ignoreButton = document.querySelector("[data-ignore]");
const alwaysAllowButton = document.querySelector("[data-always-allow]");
const openDraftButton = document.querySelector("[data-open-draft]");
const followup = document.querySelector("[data-followup]");
const followupInput = document.querySelector("[data-followup-input]");
const followupHighlight = document.querySelector("[data-followup-highlight]");
const mentionMenu = document.querySelector("[data-mention-menu]");
const voiceButton = document.querySelector("[data-voice]");
const sendButton = document.querySelector(".send-button");
const voiceTooltip = document.querySelector("[data-voice-tooltip]");
const computerStopTooltip = document.querySelector("[data-computer-stop-tooltip]");
const responseFeedbackTooltip = document.querySelector("[data-response-feedback-tooltip]");
const responseFeedbackTooltipLabel = document.querySelector("[data-response-feedback-tooltip-label]");
const badResponseModal = document.querySelector("[data-bad-response-modal]");
const badResponseForm = document.querySelector("[data-bad-response-form]");
const badResponseInput = document.querySelector("[data-bad-response-input]");
const badResponseCancel = document.querySelector("[data-bad-response-cancel]");
const badResponseInfoButton = document.querySelector("[data-bad-response-info]");
const badResponseInfoTooltip = document.querySelector("[data-bad-response-info-tooltip]");
if (mentionMenu?.parentElement !== document.body) {
  document.body.append(mentionMenu);
}

function applyTheme(theme) {
  const choice = theme?.choice || "dark";
  const resolved = theme?.resolved || (choice === "light" ? "light" : "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = choice;
}

async function initializeTheme() {
  try {
    applyTheme(await window.ambient?.getTheme?.());
  } catch {
    applyTheme({ choice: "dark", resolved: "dark" });
  }
}

window.ambient?.onThemeChange?.(applyTheme);
initializeTheme();

let typeTimer;
let typingResizeTimer;
let resizeFrame;
let lastHeight = 100;
let resizeRequestId = 0;
let followupPastePending = false;
let mentionMenuLayoutToken = 0;
let mentionMenuVisibilityToken = 0;
let mentionMenuHideTimer = null;
let mentionMenuWindowExtraHeight = 0;
let prefillMentionAnimationTimer = null;
let followupAutosizeTimer = null;
let bottomControlsUnlockTimer = null;
let thinkingRow;
const stageTimers = [];
const COLLAPSED_MESSAGE_HEIGHT = 34;
const WINDOW_GUTTER = 28;
const CARD_HEIGHT_GUARD = 2;
const MAX_WINDOW_HEIGHT = 2200;
const EXPANDED_WINDOW_WIDTH = 352;
const COMPACT_WINDOW_WIDTH = 188;
const COMPACT_WINDOW_HEIGHT = 64;
const MODE_FADE_OUT_MS = 120;
const MODE_FADE_IN_MS = 150;
const MENTION_MENU_ANIMATION_MS = 150;
let voiceSession;
let ambientThreadId = null;
let ambientSessionLoadToken = 0;
let askingAgent = false;
let autoScrollToBottom = false;
let programmaticScrollUntil = 0;
let scrollFollowFrame = 0;
let streamingShouldFollow = false;
let streamingFollowFrame = 0;
let lastStreamingFollowBottom = 0;
let lastCardHeight = 100;
let liveContentResizeFrame = 0;
let compactMode = false;
let modeTransitioning = false;
let expandedWindowHeightBeforeCompact = 120;
let activeAskRequestId = null;
let pendingComputerUseApproval = null;
let pendingComputerUseCriticalApproval = null;
let queuedFollowupSubmitOptions = null;
let activeComputerUseActionItem = null;
let activeComputerUseApprovalId = null;
const completedComputerUseApprovalIds = new Set();
let streamingMessage = null;
let streamingContent = null;
let streamingMessageVisible = false;
let streamingText = "";
let streamingVisibleText = "";
let streamingRenderedWordCount = 0;
let streamingRevealTimer = 0;
let streamingFinalizing = false;
let streamingCompleteCallback = null;
let streamingMessageMetadata = null;
let streamingMessageRecord = null;
let pendingBadResponseFeedbackTarget = null;
let ambientLayoutBatchToken = 0;
let suppressContentObserverResize = false;
const STREAMING_REVEAL_DELAY_MS = 76;
const STREAMING_RESIZE_DELAY_MS = 170;
const MENTION_MENU_GAP = 8;
const MENTION_MENU_ROW_HEIGHT = 34;
const MENTION_MENU_CHROME_HEIGHT = 12;
const MENTION_MENU_MAX_HEIGHT = (MENTION_MENU_ROW_HEIGHT * 5) + MENTION_MENU_CHROME_HEIGHT;
const FOLLOWUP_INPUT_MIN_HEIGHT = 26;
const FOLLOWUP_AUTOSIZE_MS = 150;
const FEEDBACK_BEFORE_FOLLOWUP_MS = 170;
const mentionFallbackSuggestions = {
  skills: [],
  people: []
};
let mentionSuggestions = mentionFallbackSuggestions;
let mentionMatches = [];
let activeMentionQuery = null;
let activeMentionIndex = 0;
let activeMentionFilter = "";
let voiceTranscriptionEnabled = false;
let voiceTranscriptionProvider = "";
let voiceTranscriptionHasOpenAIKey = false;
let voiceTranscriptionHasGroqKey = false;
let voiceShortcutAccelerator = "Alt+M";
let voiceShortcutLabel = "⌥M";
let nativeVoiceFallbackUntil = 0;
let nativeVoiceSilenceFailures = 0;
const NATIVE_VOICE_FALLBACK_MS = 5 * 60 * 1000;
const DEAD_AUDIO_LEVEL = 0.00002;
const COMPUTER_STOP_SHORTCUT_LABEL = "⌘.";
const COMMAND_CENTER_PROMPTS = [
  "What's on your mind?",
  "What are we doing?",
  "Where should we start?",
  "What needs attention?",
  "What should I handle?",
  "Need help with anything?",
  "What are you working on?",
  "What should we tackle?",
  "How can I help?",
  "What comes next?"
];
const COMMAND_CENTER_PROMPT = COMMAND_CENTER_PROMPTS[0];
const COMMAND_CENTER_PROMPT_STORAGE_KEY = "openargos:lastCommandCenterPrompt";
let voiceShortcutHeld = false;
let commandCenterUserName = "";
let commandCenterMode = "";
let commandCenterPrompt = COMMAND_CENTER_PROMPT;
let commandCenterSoundContext;
let lastCommandCenterSoundAt = 0;
const launchParams = new URLSearchParams(window.location.search);
const initialCommandCenter = launchParams.get("commandCenter") === "1";
const initialCommandCenterUserName = launchParams.get("userName") || "";
const initialCommandCenterMode = launchParams.get("commandMode") || "";
const initialCommandCenterPrefill = launchParams.get("prefill") || "";
const initialCommandCenterPrompt = launchParams.get("prompt") || "";
const initialCommandCenterMessage = launchParams.get("initialMessage") || "";
const deferInitialFollowup = launchParams.get("deferInitial") === "1";

function cleanUserName(value) {
  const name = String(value || "").trim();
  return name || "there";
}

function pickCommandCenterPrompt() {
  const prompts = COMMAND_CENTER_PROMPTS.filter(Boolean);
  if (!prompts.length) return COMMAND_CENTER_PROMPT;
  const lastPrompt = sessionStorage.getItem(COMMAND_CENTER_PROMPT_STORAGE_KEY) || "";
  const candidates = prompts.length > 1
    ? prompts.filter((item) => item !== lastPrompt)
    : prompts;
  const prompt = candidates[Math.floor(Math.random() * candidates.length)] || COMMAND_CENTER_PROMPT;
  sessionStorage.setItem(COMMAND_CENTER_PROMPT_STORAGE_KEY, prompt);
  return prompt;
}

function hasAmbientMessages() {
  return Boolean(log?.querySelector(".ambient-message, .thinking"));
}

function hasOnlyCommandIntroMessages() {
  const messages = Array.from(log?.querySelectorAll(".ambient-message") || []);
  return messages.length > 0 && messages.every((message) => message.dataset.commandIntro === "true");
}

function isCommandIntroMessage(message = {}) {
  return false;
}

function updateMessagePresence() {
  card?.classList.toggle("has-messages", hasAmbientMessages());
}

function beginAmbientLayoutBatch() {
  suppressContentObserverResize = true;
  ambientLayoutBatchToken += 1;
  return ambientLayoutBatchToken;
}

function endAmbientLayoutBatch(token) {
  if (token !== ambientLayoutBatchToken) return;
  suppressContentObserverResize = false;
}

function playCommandCenterSound() {
  const now = Date.now();
  if (now - lastCommandCenterSoundAt < 1200) return;
  lastCommandCenterSoundAt = now;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  commandCenterSoundContext ||= new AudioContextClass();
  const context = commandCenterSoundContext;
  void context.resume?.();
  const startedAt = context.currentTime + 0.01;
  const duration = 1.35;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, startedAt);
  master.gain.exponentialRampToValueAtTime(0.09, startedAt + 0.055);
  master.gain.linearRampToValueAtTime(0.052, startedAt + 0.34);
  master.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(5200, startedAt);
  lowpass.frequency.exponentialRampToValueAtTime(2600, startedAt + duration);
  lowpass.Q.setValueAtTime(0.42, startedAt);

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(180, startedAt);
  highpass.Q.setValueAtTime(0.5, startedAt);

  lowpass.connect(highpass);
  highpass.connect(master);
  master.connect(context.destination);

  [
    { frequency: 392.0, gain: 0.18, delay: 0, type: "sine", bend: 4 },
    { frequency: 587.33, gain: 0.12, delay: 0.025, type: "sine", bend: -3 },
    { frequency: 880.0, gain: 0.055, delay: 0.08, type: "triangle", bend: 2 },
    { frequency: 1174.66, gain: 0.025, delay: 0.14, type: "sine", bend: -2 }
  ].forEach((voice, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startedAt + voice.delay;
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, noteStart);
    oscillator.frequency.exponentialRampToValueAtTime(voice.frequency + voice.bend, noteStart + duration - voice.delay);
    oscillator.detune.setValueAtTime(index * 0.8, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(voice.gain, noteStart + 0.028);
    gain.gain.linearRampToValueAtTime(voice.gain * 0.42, noteStart + 0.26);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
    oscillator.connect(gain);
    gain.connect(lowpass);
    oscillator.start(noteStart);
    oscillator.stop(startedAt + duration);
  });
}

function isBodyAtBottom(threshold = 12) {
  if (!body) return true;
  return body.scrollTop + body.clientHeight >= body.scrollHeight - threshold;
}

function getStatusState() {
  return {
    text: status.textContent,
    shimmer: status.classList.contains("shimmer"),
    done: status.classList.contains("done"),
    spinner: Boolean(status.querySelector(".ambient-status-spinner"))
  };
}

function applyStatusState(state) {
  if (!state) return;
  setStatusText(state.text, {
    shimmer: state.shimmer,
    done: state.done,
    spinner: state.spinner
  });
}

function appendStatusSpinner() {
  const spinner = document.createElement("span");
  spinner.className = "ambient-status-spinner";
  spinner.setAttribute("aria-hidden", "true");
  status.append(spinner);
}

function setStatusText(text, { shimmer = false, done = false, spinner = false } = {}) {
  status.textContent = text;
  status.classList.toggle("shimmer", shimmer);
  status.classList.toggle("done", done);
  status.classList.remove("command-prompt-reveal");
  if (spinner) appendStatusSpinner();
}

function setVoiceStatus(text, { shimmer = true, done = false } = {}) {
  setStatusText(text, { shimmer, done });
}

function updateScrollState() {
  if (!card || !body) return;
  updateMessagePresence();
  const canScroll = body.scrollHeight > body.clientHeight + 1;
  const scrolled = body.scrollTop > 1;
  const atBottom = isBodyAtBottom(2);
  const actionsOffset = actions.hidden ? 0 : actions.getBoundingClientRect().height + 14;
  const followupOffset = followup.hidden ? 0 : followup.getBoundingClientRect().height + 10;
  card.style.setProperty("--bottom-fade-offset", `${16 + actionsOffset + followupOffset}px`);
  card.classList.toggle("body-scrollable", canScroll);
  card.classList.toggle("body-scrolled", canScroll && scrolled);
  card.classList.toggle("body-at-bottom", !canScroll || atBottom);
}

function bodyCanScroll() {
  return Boolean(body && body.scrollHeight > body.clientHeight + 1);
}

function scrollBodyToBottom({ smooth = false, follow = false, force = false } = {}) {
  if (!body || (!force && !bodyCanScroll())) return;
  const distance = body.scrollHeight - body.clientHeight - body.scrollTop;
  if (!force && follow && distance < 6) {
    updateScrollState();
    return;
  }
  programmaticScrollUntil = Date.now() + (smooth ? 260 : 120);
  body.scrollTo({
    top: body.scrollHeight,
    behavior: smooth ? "smooth" : "auto"
  });
  updateScrollState();
}

function forceBodyToBottomNow() {
  if (!body) return;
  autoScrollToBottom = true;
  scrollBodyToBottom({ force: true });
  window.requestAnimationFrame(() => scrollBodyToBottom({ force: true }));
}

function pinBodyToBottomDuringLayout({ frames = 4, finalDelay = 90 } = {}) {
  if (!body) return;
  autoScrollToBottom = true;
  let remaining = Math.max(1, frames);
  const tick = () => {
    if (!autoScrollToBottom || streamingMessage) return;
    scrollBodyToBottom();
    remaining -= 1;
    if (remaining > 0) {
      window.requestAnimationFrame(tick);
      return;
    }
    window.setTimeout(() => {
      if (autoScrollToBottom && !streamingMessage) scrollBodyToBottom();
    }, finalDelay);
  };
  window.requestAnimationFrame(tick);
}

function scheduleFollowScroll() {
  if (!autoScrollToBottom || streamingMessage || !bodyCanScroll() || scrollFollowFrame) return;
  scrollFollowFrame = window.requestAnimationFrame(() => {
    scrollFollowFrame = 0;
    if (autoScrollToBottom && !streamingMessage) scrollBodyToBottom();
  });
}

function scheduleStreamingFollowScroll() {
  if (!streamingMessage || !streamingShouldFollow || !card?.classList.contains("is-height-capped") || !bodyCanScroll() || streamingFollowFrame) return;
  streamingFollowFrame = window.requestAnimationFrame(() => {
    streamingFollowFrame = 0;
    if (!streamingMessage || !streamingShouldFollow) return;
    const nextBottom = body.scrollHeight;
    if (Math.abs(nextBottom - lastStreamingFollowBottom) < 12 && isBodyAtBottom(48)) return;
    lastStreamingFollowBottom = nextBottom;
    scrollBodyToBottom({ smooth: true, follow: true });
  });
}

function handleBodyScroll() {
  updateScrollState();
  if (!bodyCanScroll() || Date.now() < programmaticScrollUntil) return;
  if (isBodyAtBottom(8)) {
    if (askingAgent || typeTimer || streamingMessage) autoScrollToBottom = true;
    if (streamingMessage) streamingShouldFollow = true;
    return;
  }
  autoScrollToBottom = false;
  streamingShouldFollow = false;
}

function handleBodyWheel(event) {
  if (event.deltaY < 0) {
    autoScrollToBottom = false;
    streamingShouldFollow = false;
  }
}

function handleBodyKeydown(event) {
  if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
    autoScrollToBottom = false;
    streamingShouldFollow = false;
  }
  if (event.key === "End") {
    autoScrollToBottom = true;
    if (streamingMessage) {
      streamingShouldFollow = true;
      scheduleStreamingFollowScroll();
      return;
    }
    scheduleFollowScroll();
  }
}

function measureCardHeight(logHeightOverride) {
  if (!card || !body) return 0;
  updateMessagePresence();
  const styles = getComputedStyle(card);
  const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
  const header = document.querySelector(".ambient-header");
  const bodyStyles = getComputedStyle(body);
  const bodyHidden = getComputedStyle(body).display === "none";
  const bodyTop = bodyHidden ? 0 : parseFloat(bodyStyles.marginTop) || 0;
  const actionsHeight = actions.hidden ? 0 : actions.getBoundingClientRect().height + 14;
  const followupHeight = followup.hidden ? 0 : followup.getBoundingClientRect().height + 10;
  const logHeight = bodyHidden
    ? 0
    : logHeightOverride ?? log.scrollHeight;
  const heightGuard = bodyHidden ? 0 : CARD_HEIGHT_GUARD;
  return padding + border + header.getBoundingClientRect().height + bodyTop + logHeight + actionsHeight + followupHeight + heightGuard;
}

async function setOverlayHeight(cardHeight, { force = false, animate = false, duration = 150, noShrink = false, wait = false } = {}) {
  if (!card || compactMode) return;
  const windowExtraHeight = Math.max(0, Math.ceil(mentionMenuWindowExtraHeight || 0));
  let nextCardHeight = Math.max(96, Math.min(MAX_WINDOW_HEIGHT - WINDOW_GUTTER - windowExtraHeight, Math.ceil(cardHeight)));
  if (noShrink && lastCardHeight > 0 && nextCardHeight < lastCardHeight) {
    nextCardHeight = lastCardHeight;
  }
  let nextWindowHeight = nextCardHeight + WINDOW_GUTTER + windowExtraHeight;
  if (!force && Math.abs(nextWindowHeight - lastHeight) < 2) return;
  const requestId = ++resizeRequestId;
  window.cancelAnimationFrame(resizeFrame);

  const applyCardHeight = (windowHeight, windowWidth) => {
    const actualCardHeight = Math.max(96, Math.min(nextCardHeight, windowHeight - WINDOW_GUTTER - windowExtraHeight));
    const heightCapped = nextCardHeight - actualCardHeight > 2;
    card.style.height = `${actualCardHeight}px`;
    card.style.minHeight = `${actualCardHeight}px`;
    card.classList.toggle("is-height-capped", heightCapped);
    lastCardHeight = actualCardHeight;
    if (windowWidth) {
      document.documentElement.style.setProperty("--ambient-window-width", `${windowWidth}px`);
    }
    positionMentionMenu();
    updateScrollState();
    if (heightCapped && !streamingMessage) scheduleFollowScroll();
    if (heightCapped && streamingMessage) scheduleStreamingFollowScroll();
  };

  const result = await window.ambient?.resize?.({
    height: nextWindowHeight,
    animate,
    duration,
    wait
  });
  if (requestId !== resizeRequestId) return;
  const actualWindowHeight = result?.height ?? nextWindowHeight;
  const actualWindowWidth = result?.width;
  lastHeight = actualWindowHeight;
  resizeFrame = window.requestAnimationFrame(() => applyCardHeight(actualWindowHeight, actualWindowWidth));
}

function resizeToContent(options = {}) {
  if (compactMode) return;
  const resizePromise = setOverlayHeight(measureCardHeight(), options);
  if (autoScrollToBottom && !streamingMessage) {
    window.requestAnimationFrame(() => {
      if (card?.classList.contains("is-height-capped")) scheduleFollowScroll();
    });
  }
  if (voiceTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionVoiceTooltip);
  }
  if (computerStopTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionComputerStopTooltip);
  }
  if (responseFeedbackTooltip?.classList.contains("visible")) {
    const trigger = document.querySelector(".message-feedback-button:hover, .message-feedback-button:focus");
    if (trigger) window.requestAnimationFrame(() => positionResponseFeedbackTooltip(trigger));
  }
  if (badResponseInfoTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionBadResponseInfoTooltip);
  }
  return resizePromise;
}

function resizeStreamingToContent({ force = false, noShrink = true } = {}) {
  setOverlayHeight(measureCardHeight(), { force, noShrink });
  if (voiceTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionVoiceTooltip);
  }
  if (computerStopTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionComputerStopTooltip);
  }
  if (responseFeedbackTooltip?.classList.contains("visible")) {
    const trigger = document.querySelector(".message-feedback-button:hover, .message-feedback-button:focus");
    if (trigger) window.requestAnimationFrame(() => positionResponseFeedbackTooltip(trigger));
  }
  if (badResponseInfoTooltip?.classList.contains("visible")) {
    window.requestAnimationFrame(positionBadResponseInfoTooltip);
  }
}

function scheduleLiveContentResize() {
  if (liveContentResizeFrame) return;
  liveContentResizeFrame = window.requestAnimationFrame(() => {
    liveContentResizeFrame = 0;
    if (streamingMessage) {
      resizeStreamingToContent({ force: true });
      return;
    }
    if (typeTimer) {
      resizeToContent({ force: true, noShrink: true });
    }
  });
}

function measureUserMessageHeight(text) {
  if (!log) return 34;
  const logRect = log.getBoundingClientRect();
  const probe = document.createElement("div");
  probe.className = "ambient-message user-message";
  renderUserMessageText(probe, text);
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.left = "-10000px";
  probe.style.top = "0";
  probe.style.maxWidth = `${Math.max(96, logRect.width * 0.88)}px`;
  document.body.append(probe);
  const height = probe.getBoundingClientRect().height || 34;
  probe.remove();
  return height;
}

function estimateSubmitGrowth(text) {
  const logStyles = log ? getComputedStyle(log) : null;
  const gap = Number.parseFloat(logStyles?.rowGap || logStyles?.gap || "10") || 10;
  const existingItems = log?.children?.length || 0;
  const addedGap = (existingItems > 0 ? gap : 0) + gap;
  const userHeight = measureUserMessageHeight(text);
  const thinkingHeight = 17;
  return Math.max(0, userHeight + thinkingHeight + addedGap) + CARD_HEIGHT_GUARD;
}

function shouldTopAnchorSubmitForCurrentState() {
  return false;
}

function positionMentionMenu() {
  if (!mentionMenu || mentionMenu.hidden || !followup) return;
  const rect = followup.getBoundingClientRect();
  const screenTop = Number.isFinite(window.screen?.availTop) ? window.screen.availTop : 0;
  const screenBottom = screenTop + (Number.isFinite(window.screen?.availHeight) ? window.screen.availHeight : window.innerHeight);
  const windowTop = Number.isFinite(window.screenY) ? window.screenY : window.screenTop || 0;
  const visibleBelow = Math.max(0, window.innerHeight - rect.bottom - MENTION_MENU_GAP - 6);
  const growableBelow = Math.max(0, screenBottom - (windowTop + rect.bottom) - MENTION_MENU_GAP - 14);
  const availableBelow = Math.max(visibleBelow, growableBelow);
  const availableAbove = Math.max(0, rect.top - MENTION_MENU_GAP - 6);
  const naturalHeight = Math.min(
    Math.max(mentionMenu.scrollHeight || mentionMenu.getBoundingClientRect().height || MENTION_MENU_MAX_HEIGHT, MENTION_MENU_ROW_HEIGHT + MENTION_MENU_CHROME_HEIGHT),
    MENTION_MENU_MAX_HEIGHT
  );
  const placeAbove = availableBelow < naturalHeight && availableAbove > availableBelow;
  const availableHeight = Math.max(
    MENTION_MENU_ROW_HEIGHT + MENTION_MENU_CHROME_HEIGHT,
    Math.min(placeAbove ? availableAbove : availableBelow, MENTION_MENU_MAX_HEIGHT)
  );
  const menuHeight = Math.min(naturalHeight, availableHeight);
  const menuTop = placeAbove ? rect.top - MENTION_MENU_GAP - menuHeight : rect.bottom + MENTION_MENU_GAP;
  mentionMenu.style.setProperty("--mention-menu-left", `${Math.round(rect.left)}px`);
  mentionMenu.style.setProperty("--mention-menu-width", `${Math.round(rect.width)}px`);
  mentionMenu.style.setProperty("--mention-menu-max-height", `${Math.round(availableHeight)}px`);
  mentionMenu.style.setProperty("--mention-menu-top", `${Math.round(menuTop)}px`);
  mentionMenu.dataset.placement = placeAbove ? "above" : "below";
  const baseWindowHeight = (card?.getBoundingClientRect().height || lastCardHeight || window.innerHeight) + WINDOW_GUTTER;
  mentionMenuWindowExtraHeight = Math.max(0, Math.ceil(menuTop + menuHeight + 8 - baseWindowHeight));
}

function syncMentionMenuLayout({ resize = true } = {}) {
  if (!card) return;
  const token = ++mentionMenuLayoutToken;
  const menuHidden = !mentionMenu || mentionMenu.hidden;
  if (menuHidden) {
    const preserveCardHeight = lastCardHeight || card.getBoundingClientRect().height || measureCardHeight();
    mentionMenuWindowExtraHeight = 0;
    mentionMenu?.style.removeProperty("--mention-menu-left");
    mentionMenu?.style.removeProperty("--mention-menu-top");
    mentionMenu?.style.removeProperty("--mention-menu-width");
    mentionMenu?.style.removeProperty("--mention-menu-max-height");
    if (mentionMenu) delete mentionMenu.dataset.placement;
    if (resize) void setOverlayHeight(preserveCardHeight, { force: true, noShrink: true });
    return;
  }

  positionMentionMenu();
  if (!resize) return;
  void resizeToContent({ force: true, noShrink: true })?.then?.(() => {
    if (token !== mentionMenuLayoutToken || mentionMenu?.hidden) return;
    positionMentionMenu();
  });
}

function setMentionMenuHidden(hidden) {
  if (!mentionMenu) return;
  const token = ++mentionMenuVisibilityToken;
  if (mentionMenuHideTimer) {
    window.clearTimeout(mentionMenuHideTimer);
    mentionMenuHideTimer = null;
  }

  if (!hidden) {
    const wasHidden = mentionMenu.hidden;
    mentionMenu.hidden = false;
    mentionMenu.classList.remove("is-closing");
    if (wasHidden) {
      mentionMenu.classList.remove("is-open");
      syncMentionMenuLayout();
      window.requestAnimationFrame(() => {
        if (token !== mentionMenuVisibilityToken || mentionMenu.hidden) return;
        mentionMenu.classList.add("is-open");
      });
      return;
    }
    mentionMenu.classList.add("is-open");
    syncMentionMenuLayout();
    return;
  }

  if (mentionMenu.hidden) {
    const hadWindowExtra = mentionMenuWindowExtraHeight > 0;
    mentionMenuWindowExtraHeight = 0;
    if (hadWindowExtra) {
      const preserveCardHeight = lastCardHeight || card?.getBoundingClientRect().height || measureCardHeight();
      void setOverlayHeight(preserveCardHeight, { force: true, noShrink: true });
    }
    return;
  }

  mentionMenu.classList.remove("is-open");
  mentionMenu.classList.add("is-closing");
  syncMentionMenuLayout();
  mentionMenuHideTimer = window.setTimeout(() => {
    if (token !== mentionMenuVisibilityToken || !mentionMenu.classList.contains("is-closing")) return;
    mentionMenu.hidden = true;
    mentionMenu.classList.remove("is-closing", "is-open");
    syncMentionMenuLayout();
  }, MENTION_MENU_ANIMATION_MS);
}

function targetCardHeightFor(cardHeight) {
  const windowExtraHeight = Math.max(0, Math.ceil(mentionMenuWindowExtraHeight || 0));
  return Math.max(96, Math.min(MAX_WINDOW_HEIGHT - WINDOW_GUTTER - windowExtraHeight, Math.ceil(cardHeight)));
}

function setLocalCardHeight(cardHeight) {
  if (!card || compactMode) return;
  const nextCardHeight = targetCardHeightFor(cardHeight);
  card.style.height = `${nextCardHeight}px`;
  card.style.minHeight = `${nextCardHeight}px`;
  lastCardHeight = nextCardHeight;
}

function resetAmbientSizingForSessionLoad() {
  if (!card) return;
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
  }
  if (bottomControlsUnlockTimer) {
    window.clearTimeout(bottomControlsUnlockTimer);
    bottomControlsUnlockTimer = null;
  }
  if (followupAutosizeTimer) {
    window.clearTimeout(followupAutosizeTimer);
    followupAutosizeTimer = null;
  }
  resizeRequestId += 1;
  mentionMenuWindowExtraHeight = 0;
  lastHeight = 0;
  lastCardHeight = 0;
  card.style.removeProperty("height");
  card.style.removeProperty("min-height");
  card.classList.remove("is-height-capped", "body-scrollable", "body-scrolled", "body-at-bottom");
  if (body) body.scrollTop = 0;
}

async function preGrowForSubmit(text, { animate = true } = {}) {
  if (!card) return;
  const currentMeasuredHeight = measureCardHeight();
  const targetHeight = currentMeasuredHeight + estimateSubmitGrowth(text);
  await setOverlayHeight(targetHeight, {
    force: true,
    animate: false,
    duration: 0,
    noShrink: true,
    wait: true
  });
  await nextPaintFrame();
  await nextPaintFrame();
}

async function prepareSubmitLayout(text, { layoutBatch = null } = {}) {
  const activeLayoutBatch = layoutBatch || beginAmbientLayoutBatch();
  const isFirstVisibleMessage = !hasAmbientMessages() || hasOnlyCommandIntroMessages();

  card?.classList.remove("is-command-center");
  status.classList.remove("command-prompt-reveal");
  updatePreviousMessages();
  ensureFollowupVisibleForTyping();
  updateMessagePresence();

  try {
    await preGrowForSubmit(text, { animate: !isFirstVisibleMessage });
  } catch {
    // Keep submit moving if the overlay resize bridge is briefly unavailable.
  }

  return activeLayoutBatch;
}

function scheduleTypingResize() {
  if (typingResizeTimer) return;
  typingResizeTimer = window.setTimeout(() => {
    typingResizeTimer = null;
    if (streamingMessage) {
      resizeStreamingToContent();
      return;
    }
    resizeToContent({ animate: true, duration: 150 });
  }, streamingMessage ? STREAMING_RESIZE_DELAY_MS : 190);
}

function positionFloatingTooltip(trigger, tooltip) {
  if (!trigger || !tooltip) return;
  const buttonRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const margin = 8;
  const desiredLeft = buttonRect.left + buttonRect.width / 2;
  const left = Math.min(
    Math.max(desiredLeft, margin + tooltipRect.width / 2),
    window.innerWidth - margin - tooltipRect.width / 2
  );
  const top = Math.max(margin, buttonRect.top - tooltipRect.height - 9);
  tooltip.style.setProperty("--tooltip-left", `${left}px`);
  tooltip.style.setProperty("--tooltip-top", `${top}px`);
}

function positionVoiceTooltip() {
  positionFloatingTooltip(voiceButton, voiceTooltip);
}

function normalizeVoiceTranscriptionProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  return ["openai", "groq"].includes(value) ? value : "";
}

function voiceTranscriptionProviderLabel(provider) {
  return provider === "openai" ? "OpenAI" : provider === "groq" ? "Groq" : "voice";
}

function voiceTranscriptionProviderHasKey(provider = voiceTranscriptionProvider) {
  if (provider === "openai") return voiceTranscriptionHasOpenAIKey;
  if (provider === "groq") return voiceTranscriptionHasGroqKey;
  return false;
}

function currentVoiceTranscriptionSettings() {
  return {
    enabled: voiceTranscriptionEnabled,
    provider: voiceTranscriptionProvider,
    hasOpenAIKey: voiceTranscriptionHasOpenAIKey,
    hasGroqKey: voiceTranscriptionHasGroqKey
  };
}

function voiceTranscriptionBlockReason() {
  if (!voiceTranscriptionProvider) {
    return {
      title: "Voice unavailable",
      body: "Choose a voice provider in Settings > Models"
    };
  }
  if (!voiceTranscriptionProviderHasKey()) {
    return {
      title: "Voice unavailable",
      body: `Add a ${voiceTranscriptionProviderLabel(voiceTranscriptionProvider)} key in Settings > Models`
    };
  }
  if (!voiceTranscriptionEnabled) {
    return {
      title: "Voice unavailable",
      body: "Turn on a voice provider in Settings > Models"
    };
  }
  return null;
}

function renderVoiceTooltipCopy() {
  const lines = voiceTooltip?.querySelectorAll("span");
  if (!lines?.length) return;
  const blockReason = voiceTranscriptionBlockReason();
  if (blockReason) {
    lines[0].textContent = blockReason.title;
    if (lines[1]) lines[1].textContent = blockReason.body;
    return;
  }
  lines[0].textContent = "Real-time voice";
  if (lines[1]) lines[1].textContent = `Hold ${voiceShortcutLabel} to record audio`;
}

function applyVoiceTranscriptionSettings(payload = {}) {
  voiceTranscriptionProvider = normalizeVoiceTranscriptionProvider(payload.provider);
  voiceTranscriptionHasOpenAIKey = Boolean(payload.hasOpenAIKey);
  voiceTranscriptionHasGroqKey = Boolean(payload.hasGroqKey);
  voiceTranscriptionEnabled = Boolean(payload.enabled && voiceTranscriptionProviderHasKey());
  const blockReason = voiceTranscriptionBlockReason();
  voiceButton?.classList.toggle("voice-unavailable", Boolean(blockReason));
  voiceButton?.setAttribute("aria-disabled", blockReason ? "true" : "false");
  voiceButton?.setAttribute("aria-label", blockReason ? blockReason.title : "Use voice");
  voiceButton?.setAttribute("title", blockReason ? blockReason.body : `Record voice (${voiceShortcutLabel})`);
  renderVoiceTooltipCopy();
}

function showVoiceTooltip() {
  if (!voiceTooltip) return;
  renderVoiceTooltipCopy();
  positionVoiceTooltip();
  voiceTooltip.classList.add("visible");
}

function hideVoiceTooltip() {
  voiceTooltip?.classList.remove("visible");
}

function positionComputerStopTooltip() {
  const trigger = activeComputerUseActionItem?.querySelector(".ambient-computer-stop:hover, .ambient-computer-stop:focus") ||
    document.querySelector(".ambient-computer-stop:hover, .ambient-computer-stop:focus");
  positionFloatingTooltip(trigger, computerStopTooltip);
}

function showComputerStopTooltip(trigger) {
  if (!computerStopTooltip || !trigger) return;
  positionFloatingTooltip(trigger, computerStopTooltip);
  computerStopTooltip.classList.add("visible");
}

function hideComputerStopTooltip() {
  computerStopTooltip?.classList.remove("visible");
}

function positionResponseFeedbackTooltip(trigger) {
  positionFloatingTooltip(trigger, responseFeedbackTooltip);
}

function showResponseFeedbackTooltip(trigger) {
  if (!responseFeedbackTooltip || !trigger) return;
  if (responseFeedbackTooltipLabel) {
    responseFeedbackTooltipLabel.textContent = trigger.dataset.feedbackLabel || trigger.getAttribute("aria-label") || "";
  }
  positionResponseFeedbackTooltip(trigger);
  responseFeedbackTooltip.classList.add("visible");
}

function hideResponseFeedbackTooltip() {
  responseFeedbackTooltip?.classList.remove("visible");
}

function positionBadResponseInfoTooltip() {
  positionFloatingTooltip(badResponseInfoButton, badResponseInfoTooltip);
}

function showBadResponseInfoTooltip() {
  if (!badResponseInfoTooltip || !badResponseInfoButton) return;
  positionBadResponseInfoTooltip();
  badResponseInfoTooltip.classList.add("visible");
}

function hideBadResponseInfoTooltip() {
  badResponseInfoTooltip?.classList.remove("visible");
}

function setBadResponseModal(open, target = null) {
  if (!badResponseModal) return;
  badResponseModal.hidden = !open;
  if (!open) {
    hideBadResponseInfoTooltip();
    pendingBadResponseFeedbackTarget = null;
  } else {
    pendingBadResponseFeedbackTarget = target;
  }
  if (open) {
    if (badResponseInput) badResponseInput.value = "";
    window.requestAnimationFrame(() => badResponseInput?.focus({ preventScroll: true }));
  }
}

function logVoice(event, payload = {}) {
  try {
    void window.ambient?.voiceLog?.(event, payload);
  } catch {
    // Diagnostics only.
  }
}

function closeAmbient() {
  if (window.ambient?.close) {
    window.ambient.close();
    return;
  }

  window.close();
}

function dismissAmbient() {
  const card = document.querySelector(".ambient-card");
  stageTimers.forEach((timer) => window.clearTimeout(timer));
  window.clearInterval(typeTimer);
  window.clearTimeout(typingResizeTimer);
  typingResizeTimer = null;
  window.cancelAnimationFrame(resizeFrame);

  if (!card) {
    closeAmbient();
    return;
  }

  const currentHeight = Math.ceil(card.getBoundingClientRect().height);
  card.style.height = `${currentHeight}px`;
  card.style.minHeight = `${currentHeight}px`;
  card.getBoundingClientRect();

  let closed = false;
  const handleDismissAnimationEnd = (event) => {
    if (event.target !== card) return;
    if (event.animationName !== "ambient-dismiss") return;
    finishClose();
  };
  const finishClose = () => {
    if (closed) return;
    closed = true;
    card.removeEventListener("animationend", handleDismissAnimationEnd);
    closeAmbient();
  };

  card.addEventListener("animationend", handleDismissAnimationEnd);
  window.setTimeout(finishClose, 340);
  window.requestAnimationFrame(() => {
    card.classList.add("is-dismissing");
  });
}

async function enterCompactMode() {
  if (!card || compactMode || modeTransitioning) return;
  modeTransitioning = true;

  try {
    if (voiceSession) stopVoiceInput();
    hideVoiceTooltip();
    expandedWindowHeightBeforeCompact = Math.max(
      lastHeight || 0,
      Math.ceil(card.getBoundingClientRect().height) + WINDOW_GUTTER,
      120
    );
    window.cancelAnimationFrame(scrollFollowFrame);
    scrollFollowFrame = 0;
    autoScrollToBottom = false;
    updateScrollState();
    card.classList.remove("is-mode-fading-in", "is-content-hidden", "is-shell-hidden", "is-expanding");
    card.classList.add("is-mode-transitioning", "is-mode-fading-out");
    await wait(MODE_FADE_OUT_MS);

    compactMode = true;
    document.body.classList.add("is-compact-mode");
    card.classList.add("is-compact");
    card.style.height = "";
    card.style.minHeight = "";

    const result = await window.ambient?.resize?.({
      width: COMPACT_WINDOW_WIDTH,
      height: COMPACT_WINDOW_HEIGHT
    });
    lastHeight = result?.height || COMPACT_WINDOW_HEIGHT;
    card.getBoundingClientRect();
    card.classList.remove("is-mode-fading-out");
    card.classList.add("is-mode-fading-in");
    await wait(MODE_FADE_IN_MS);
    card.classList.remove("is-mode-transitioning", "is-mode-fading-in");
  } finally {
    modeTransitioning = false;
  }
}

async function exitCompactMode() {
  if (!card || !compactMode || modeTransitioning) return;
  modeTransitioning = true;

  try {
    const targetHeight = Math.max(expandedWindowHeightBeforeCompact || 120, 120);
    const targetCardHeight = Math.max(96, targetHeight - WINDOW_GUTTER);
    card.classList.remove("is-mode-fading-in", "is-content-hidden", "is-shell-hidden", "is-expanding");
    card.classList.add("is-mode-transitioning", "is-mode-fading-out");
    await wait(MODE_FADE_OUT_MS);

    const result = await window.ambient?.resize?.({
      width: EXPANDED_WINDOW_WIDTH,
      height: targetHeight
    });
    lastHeight = result?.height || targetHeight;
    compactMode = false;
    document.body.classList.remove("is-compact-mode");
    card.style.height = `${targetCardHeight}px`;
    card.style.minHeight = `${targetCardHeight}px`;
    card.classList.remove("is-compact");
    card.getBoundingClientRect();
    card.classList.remove("is-mode-fading-out");
    card.classList.add("is-mode-fading-in");
    resizeToContent({ force: true });
    await wait(MODE_FADE_IN_MS);
    card.classList.remove("is-mode-transitioning", "is-mode-fading-in");
    queueFollowupFocus();
  } finally {
    modeTransitioning = false;
  }
}

function tokenize(text) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

function normalizeCollapsedMarkdownTables(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => {
      if (!line.includes("|")) return line;
      return line
        .replace(/(\|[^\n]*?\|)\s+(\|[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|)/g, "$1\n$2")
        .replace(/(\|[^\n]*?\|)\s+(?=\|(?:[^|\n]*\|){2,})/g, "$1\n");
    })
    .join("\n");
}

function splitMarkdownTableRow(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("|")) return [];
  const withoutLeading = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutTrailing = withoutLeading.endsWith("|") ? withoutLeading.slice(0, -1) : withoutLeading;
  return withoutTrailing.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line) {
  const cells = splitMarkdownTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableRow(line) {
  const trimmed = String(line || "").trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && splitMarkdownTableRow(trimmed).length > 1;
}

function markdownTableAlignment(separatorCell) {
  const cell = String(separatorCell || "").trim();
  const starts = cell.startsWith(":");
  const ends = cell.endsWith(":");
  if (starts && ends) return "center";
  if (ends) return "right";
  return "left";
}

function normalizeMarkdownTableCells(cells, columnCount) {
  const normalized = cells.slice(0, columnCount);
  while (normalized.length < columnCount) normalized.push("");
  return normalized;
}

function createMarkdownTableBlock(headerCells, separatorCells, rowCells) {
  const columnCount = Math.max(
    headerCells.length,
    separatorCells.length,
    ...rowCells.map((row) => row.length)
  );
  return {
    type: "table",
    header: normalizeMarkdownTableCells(headerCells, columnCount),
    alignments: normalizeMarkdownTableCells(separatorCells, columnCount).map(markdownTableAlignment),
    rows: rowCells.map((row) => normalizeMarkdownTableCells(row, columnCount))
  };
}

function parseMarkdown(text) {
  const blocks = [];
  let paragraph = [];
  let list = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  }

  const lines = normalizeCollapsedMarkdownTables(text).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      list = null;
      continue;
    }

    if (isMarkdownTableRow(line) && isMarkdownTableSeparator(lines[index + 1])) {
      flushParagraph();
      list = null;
      const headerCells = splitMarkdownTableRow(line);
      const separatorCells = splitMarkdownTableRow(lines[index + 1]);
      const rows = [];
      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index]) && !isMarkdownTableSeparator(lines[index])) {
        rows.push(splitMarkdownTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push(createMarkdownTableBlock(headerCells, separatorCells, rows));
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        list = { type: "ul", items: [] };
        blocks.push(list);
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        list = { type: "ol", items: [] };
        blocks.push(list);
      }
      list.items.push(ordered[1]);
      continue;
    }

    if (list?.items?.length) {
      const lastIndex = list.items.length - 1;
      list.items[lastIndex] = `${list.items[lastIndex]}\n${line}`;
      continue;
    }

    list = null;
    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

function normalizeDisplayMarkdown(text) {
  const normalized = String(text || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?|```/g, "").trim());
  return normalizeCollapsedMarkdownTables(linkifyLabeledBareUrls(stripRedundantSourceLinks(normalized)));
}

function normalizeHost(value) {
  try {
    return new URL(String(value || "").trim()).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeSourceLabel(label) {
  return String(label || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function isBareHostLabel(label) {
  const normalized = normalizeSourceLabel(label);
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(normalized);
}

function stripRedundantSourceLinks(markdown) {
  const markdownLinkWithSource = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)\s*\(\s*\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)\s*\)/gi;

  return String(markdown || "").replace(markdownLinkWithSource, (match, title, titleUrl, sourceLabel, sourceUrl) => {
    const titleHost = normalizeHost(titleUrl);
    const sourceHost = normalizeHost(sourceUrl);
    const labelHost = normalizeSourceLabel(sourceLabel);
    const sameSite = titleHost && sourceHost && titleHost === sourceHost;
    const labelIsHost = isBareHostLabel(sourceLabel);

    if (sameSite && (labelIsHost || labelHost === titleHost)) {
      return `[${title}](${titleUrl})`;
    }
    return match;
  });
}

function linkifyLabeledBareUrls(markdown) {
  return String(markdown || "").replace(
    /^(\s*(?:[-*]\s+)?)([^:\n]{2,120}?):\s+(https?:\/\/[^\s]+)\s*$/gm,
    (match, prefix, label, url) => {
      if (/https?:\/\//i.test(label)) return match;
      const safeUrl = safeHttpUrl(url);
      if (!safeUrl) return match;
      return `${prefix}[${label.trim()}](${safeUrl})`;
    }
  );
}

function appendWord(parent, token, options = {}) {
  if (/^\s+$/.test(token)) {
    parent.append(document.createTextNode(token));
    return;
  }

  const format = String(options.format || "");
  const element = document.createElement(format === "strong" ? "strong" : format === "em" ? "em" : "span");
  element.className = "word";
  element.textContent = token;
  parent.append(element);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim().replace(/[),.;:!?]+$/g, ""));
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeLocalPathText(value = "") {
  return String(value || "")
    .trim()
    .replace(/^file:\/\//i, "")
    .replace(/[),.;:!?]+$/g, "");
}

function localPathLooksLikeImage(filePath = "") {
  return /\.(?:jpe?g|png|webp|gif|avif|bmp|tiff?)$/i.test(normalizeLocalPathText(filePath));
}

function localPathLabel(filePath = "") {
  return normalizeLocalPathText(filePath).replace(/^\/Users\/[^/]+/i, "~");
}

function localPathBasename(filePath = "") {
  const parts = normalizeLocalPathText(filePath).split("/").filter(Boolean);
  return parts.at(-1) || "file";
}

function localFileUrlFromPath(filePath = "") {
  const normalized = normalizeLocalPathText(filePath);
  if (!normalized.startsWith("/")) return "";
  return `file://${normalized.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function textLooksLikeSingleLocalPath(value = "") {
  return /^(?:~|\/(?:Users|Volumes|Applications|System|Library|private|tmp|var|opt|usr|bin|sbin|etc))(?:\/[^\s<>"'`()\[\]{}]+)+$/.test(normalizeLocalPathText(value));
}

function folderIconSvg() {
  return '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>';
}

function appendLocalPathLink(parent, filePath) {
  const normalized = normalizeLocalPathText(filePath);
  if (!normalized) return;
  const link = document.createElement("button");
  link.className = "ambient-local-path";
  link.type = "button";
  link.dataset.localPath = normalized;
  link.setAttribute("aria-label", `Open ${localPathBasename(normalized)} in Finder`);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "ambient-local-path-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = folderIconSvg();
  const labelSpan = document.createElement("span");
  labelSpan.className = "ambient-local-path-label";
  labelSpan.textContent = localPathLabel(normalized);
  link.append(icon, labelSpan);
  parent.append(link);
}

function appendLocalImagePreview(parent, filePath) {
  const normalized = normalizeLocalPathText(filePath);
  const url = localFileUrlFromPath(normalized);
  if (!url || !localPathLooksLikeImage(normalized)) return;
  const preview = document.createElement("button");
  preview.className = "ambient-local-image-preview";
  preview.type = "button";
  preview.dataset.localPath = normalized;
  preview.setAttribute("aria-label", `Open ${localPathBasename(normalized)} in Finder`);
  const img = document.createElement("img");
  img.alt = localPathBasename(normalized);
  img.loading = "lazy";
  img.src = url;
  img.addEventListener("load", () => resizeToContent({ force: true, animate: true, duration: 150 }));
  img.addEventListener("error", () => {
    preview.remove();
    resizeToContent({ force: true, animate: true, duration: 150 });
  });
  preview.append(img);
  parent.append(preview);
}

function parseInlineSegments(text) {
  const source = String(text || "");
  const segments = [];
  const linkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)|\[\[(\d{1,3})\]\]|\[(\d{1,3})\](?!\()|`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|((?:~|\/(?:Users|Volumes|Applications|System|Library|private|tmp|var|opt|usr|bin|sbin|etc))(?:\/[^\s<>"'`()\[\]{}]+)+)/g;
  let index = 0;
  let match;

  while ((match = linkPattern.exec(source))) {
    if (match.index > index) {
      segments.push({ type: "text", text: source.slice(index, match.index) });
    }
    const rawUrl = match[2] || match[3];
    const url = safeHttpUrl(rawUrl);
    if (url) {
      segments.push({ type: "link", text: (match[1] || "").trim(), url, raw: !match[1] });
    } else if (match[4] || match[5]) {
      segments.push({ type: "citation", text: match[4] || match[5] });
    } else if (match[6]) {
      const codeText = normalizeLocalPathText(match[6]);
      segments.push(textLooksLikeSingleLocalPath(codeText)
        ? { type: "local_path", text: codeText }
        : { type: "code", text: match[6] });
    } else if (match[7] || match[8]) {
      segments.push({ type: "strong", text: match[7] || match[8] });
    } else if (match[9] || match[10]) {
      segments.push({ type: "em", text: match[9] || match[10] });
    } else if (match[11]) {
      segments.push({ type: "local_path", text: normalizeLocalPathText(match[11]) });
    } else {
      segments.push({ type: "text", text: match[0] });
    }
    index = match.index + match[0].length;
  }

  if (index < source.length) {
    segments.push({ type: "text", text: source.slice(index) });
  }
  return segments;
}

function appendCitation(parent, text) {
  const citation = document.createElement("sup");
  citation.className = "ambient-citation";
  citation.textContent = String(text || "").trim();
  parent.append(citation);
}

function appendInlineCode(parent, text, state) {
  const code = document.createElement("code");
  code.textContent = text;
  if (state.wordIndex >= state.animateFromWord) {
    code.classList.add("word");
  }
  const codeWords = tokenize(String(text || "")).filter((token) => !/^\s+$/.test(token)).length;
  state.wordIndex += Math.max(1, codeWords);
  parent.append(code);
}

function linkLabelLooksLikeUrl(label) {
  return /^https?:\/\//i.test(String(label || "").trim());
}

function shortUrlLabel(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean).slice(0, 2);
    const path = pathParts.length ? `/${pathParts.join("/")}` : "";
    return `${host}${path}${parsed.search ? "..." : ""}`;
  } catch {
    return String(url || "");
  }
}

function appendLink(parent, label, url, options = {}) {
  const link = document.createElement("a");
  link.className = "ambient-link";
  link.href = url;
  link.dataset.url = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void window.ambient?.openExternal?.(url);
  });
  const displayLabel = (!label || options.raw || linkLabelLooksLikeUrl(label)) ? shortUrlLabel(url) : label;
  link.classList.toggle("is-url-label", options.raw || linkLabelLooksLikeUrl(label));
  const labelSpan = document.createElement("span");
  labelSpan.className = "ambient-link-label";
  labelSpan.textContent = displayLabel || shortUrlLabel(url);
  link.append(labelSpan);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "ambient-link-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>';
  link.append(icon);
  parent.append(link);
}

function appendInlineText(parent, text, state) {
  parseInlineSegments(text).forEach((segment) => {
    if (segment.type === "link") {
      appendLink(parent, segment.text, segment.url, { raw: segment.raw });
      return;
    }

    if (segment.type === "local_path") {
      appendLocalPathLink(parent, segment.text);
      state.wordIndex += 1;
      return;
    }

    if (segment.type === "citation") {
      appendCitation(parent, segment.text);
      return;
    }

    if (segment.type === "code") {
      appendInlineCode(parent, segment.text, state);
      return;
    }

    if (segment.type === "strong" || segment.type === "em") {
      tokenize(segment.text).forEach((token) => {
        if (/^\s+$/.test(token)) {
          parent.append(document.createTextNode(token));
          return;
        }

        const wordIndex = state.wordIndex;
        state.wordIndex += 1;
        if (wordIndex >= state.animateFromWord) {
          appendWord(parent, token, { format: segment.type });
        } else {
          const element = document.createElement(segment.type);
          element.textContent = token;
          parent.append(element);
        }
      });
      return;
    }

    tokenize(segment.text).forEach((token) => {
      if (/^\s+$/.test(token)) {
        parent.append(document.createTextNode(token));
        return;
      }

      const wordIndex = state.wordIndex;
      state.wordIndex += 1;
      if (wordIndex >= state.animateFromWord) {
        appendWord(parent, token);
      } else {
        parent.append(document.createTextNode(token));
      }
    });
  });
}

function localImagePathsInText(text = "") {
  const seen = new Set();
  return parseInlineSegments(text)
    .filter((segment) => segment.type === "local_path" && localPathLooksLikeImage(segment.text))
    .map((segment) => normalizeLocalPathText(segment.text))
    .filter((filePath) => {
      if (!filePath || seen.has(filePath)) return false;
      seen.add(filePath);
      return true;
    });
}

function appendMarkdownTable(parent, block, state) {
  const tableWrap = document.createElement("div");
  tableWrap.className = "ambient-markdown-table-scroll";
  const table = document.createElement("table");
  table.className = "ambient-markdown-table";

  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  block.header.forEach((cell, columnIndex) => {
    const headerCell = document.createElement("th");
    headerCell.style.textAlign = block.alignments[columnIndex] || "left";
    appendInlineText(headerCell, cell, state);
    headerRow.append(headerCell);
  });
  header.append(headerRow);
  table.append(header);

  const body = document.createElement("tbody");
  block.rows.forEach((row) => {
    const tableRow = document.createElement("tr");
    row.forEach((cell, columnIndex) => {
      const tableCell = document.createElement("td");
      tableCell.style.textAlign = block.alignments[columnIndex] || "left";
      appendInlineText(tableCell, cell, state);
      tableRow.append(tableCell);
    });
    body.append(tableRow);
  });
  table.append(body);
  tableWrap.append(table);
  parent.append(tableWrap);
}

function renderMarkdownContent(parent, text, options = {}) {
  if (!parent) return 0;
  const state = {
    wordIndex: 0,
    animateFromWord: Number.isFinite(options.animateFromWord)
      ? options.animateFromWord
      : Number.POSITIVE_INFINITY
  };
  parent.textContent = "";
  parseMarkdown(normalizeDisplayMarkdown(text)).forEach((block) => {
    if (block.type === "table") {
      appendMarkdownTable(parent, block, state);
      return;
    }

    if (block.type === "p") {
      const paragraph = document.createElement("p");
      appendInlineText(paragraph, block.text, state);
      parent.append(paragraph);
      localImagePathsInText(block.text).forEach((filePath) => appendLocalImagePreview(parent, filePath));
      return;
    }

    const list = document.createElement(block.type === "ol" ? "ol" : "ul");
    block.items.forEach((item) => {
      const listItem = document.createElement("li");
      appendInlineText(listItem, item, state);
      list.append(listItem);
    });
    parent.append(list);
  });
  return state.wordIndex;
}

function feedbackIconSvg(type) {
  if (type === "copy") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
  }
  if (type === "check") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m20 6-11 11-5-5"></path>
      </svg>
    `;
  }
  const path = type === "down"
    ? '<path d="M17 14V2"></path><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"></path>'
    : '<path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path>';
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      ${path}
    </svg>
  `;
}

function attachFeedbackTarget(message, record = {}) {
  if (!message || !record) return;
  const threadId = record.threadId || record.ambientThreadId || ambientThreadId || "";
  const messageId = record.id || record._id || record.messageId || record.ambientMessageId || "";
  if (threadId) message.dataset.threadId = threadId;
  if (messageId) message.dataset.messageId = messageId;
}

function feedbackTargetFromControls(controls) {
  const message = controls?.closest(".ambient-message");
  const threadId = message?.dataset.threadId || ambientThreadId || "";
  const messageId = message?.dataset.messageId || "";
  if (!threadId) return null;
  return { threadId, messageId };
}

async function recordResponseFeedback(controls, rating, comment = "") {
  const target = feedbackTargetFromControls(controls);
  if (!target || !window.ambient?.recordResponseFeedback) return null;
  controls.dataset.feedbackSaving = "true";
  try {
    const result = await window.ambient.recordResponseFeedback({
      ...target,
      rating,
      comment
    });
    if (!result?.ok) throw new Error(result?.message || "Could not save feedback.");
    delete controls.dataset.feedbackError;
    return result.feedback || null;
  } catch (error) {
    controls.dataset.feedbackError = "true";
    console.warn("Could not save response feedback", error);
    return null;
  } finally {
    delete controls.dataset.feedbackSaving;
  }
}

function appendAssistantFeedbackControls(message, { enabled = true, reveal = false } = {}) {
  if (!enabled || message?.dataset?.feedback === "false") return null;
  if (!message || message.querySelector(".message-feedback")) return null;
  const controls = document.createElement("div");
  controls.className = "message-feedback";
  if (reveal) controls.classList.add("is-revealing");
  controls.innerHTML = `
    <button class="message-feedback-button message-copy-button" type="button" data-copy-response data-feedback-label="Copy response" aria-label="Copy response">${feedbackIconSvg("copy")}</button>
  `;
  message.append(controls);
  if (reveal) {
    window.setTimeout(() => controls.classList.remove("is-revealing"), FEEDBACK_BEFORE_FOLLOWUP_MS + 80);
  }
  return controls;
}

function messageCopyTextFromControls(controls) {
  const message = controls?.closest(".ambient-message");
  const content = message?.querySelector(".message-content");
  return (content?.innerText || content?.textContent || message?.innerText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function copyMessageResponse(button) {
  const controls = button?.closest(".message-feedback");
  const text = messageCopyTextFromControls(controls);
  if (!text) return;
  const previousHtml = button.dataset.copyIconHtml || button.innerHTML;
  button.dataset.copyIconHtml = previousHtml;
  const previousLabel = "Copy response";
  try {
    const result = await window.ambient?.copyText?.(text);
    if (!result?.ok) throw new Error(result?.message || "Could not copy response.");
    if (button.copyResetTimer) window.clearTimeout(button.copyResetTimer);
    button.classList.add("is-copied");
    button.dataset.feedbackLabel = "Copied";
    button.setAttribute("aria-label", "Copied");
    button.innerHTML = feedbackIconSvg("check");
    showResponseFeedbackTooltip(button);
    button.copyResetTimer = window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.dataset.feedbackLabel = previousLabel;
      button.setAttribute("aria-label", previousLabel);
      button.innerHTML = previousHtml;
      button.copyResetTimer = null;
      if (button.matches(":hover, :focus")) showResponseFeedbackTooltip(button);
    }, 1000);
  } catch (error) {
    console.warn("Could not copy response", error);
  }
}

function feedbackControlValueFromRating(rating) {
  if (rating === "bad" || rating === "down") return "down";
  if (rating === "good" || rating === "up") return "up";
  return "";
}

function applyMessageFeedbackSelection(controls, value) {
  if (!controls) return;
  const selectedValue = feedbackControlValueFromRating(value);
  if (selectedValue) {
    controls.dataset.selected = selectedValue;
  } else {
    delete controls.dataset.selected;
  }

  controls.querySelectorAll(".message-feedback-button").forEach((button) => {
    const selected = Boolean(selectedValue) && button.dataset.feedbackValue === selectedValue;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function messageFeedbackSelectionValue(message) {
  return feedbackControlValueFromRating(
    message?.responseFeedback?.rating ||
    message?.metadata?.responseFeedback?.rating ||
    message?.metadata?.feedbackRating
  );
}

function setMessageFeedbackSelection(controls, value) {
  if (!controls || !value) return false;
  const nextValue = feedbackControlValueFromRating(value);
  const alreadySelected = controls.dataset.selected === nextValue;
  if (alreadySelected) {
    applyMessageFeedbackSelection(controls, "");
  } else {
    applyMessageFeedbackSelection(controls, nextValue);
  }

  resizeToContent({ force: true, animate: true, duration: 120 });
  return !alreadySelected;
}

function ensureMessageToggle(item) {
  let button = item.querySelector(".message-toggle");
  if (!button) {
    button = document.createElement("button");
    button.className = "message-toggle";
    button.type = "button";
    button.innerHTML = '<span data-toggle-label>More</span><span class="toggle-chevron"></span>';
  }
  const feedback = item.querySelector(".message-feedback");
  if (feedback && button.nextElementSibling !== feedback) {
    item.insertBefore(button, feedback);
  } else if (!button.parentElement) {
    item.append(button);
  }
  return button;
}

function prepareHistoricalCollapseAnimation(item) {
  const beforeHeight = item.getBoundingClientRect().height;
  if (!beforeHeight) return null;
  item.style.height = `${beforeHeight}px`;
  item.style.overflow = "hidden";
  item.classList.add("is-history-collapsing");
  return () => {
    const previousTransition = item.style.transition;
    item.style.transition = "none";
    item.style.height = "auto";
    const targetHeight = Math.ceil(item.getBoundingClientRect().height);
    item.style.height = `${beforeHeight}px`;
    item.getBoundingClientRect();
    item.style.transition = previousTransition;
    window.requestAnimationFrame(() => {
      item.style.height = `${targetHeight}px`;
      window.setTimeout(() => {
        item.style.height = "";
        item.style.overflow = "";
        item.classList.remove("is-history-collapsing");
      }, 260);
    });
  };
}

function ensureStreamingMessage() {
  if (streamingMessage && streamingContent) return true;
  const layoutBatch = beginAmbientLayoutBatch();
  status.textContent = "Answering";
  status.classList.add("shimmer");
  status.classList.remove("done");
  streamingMessage = document.createElement("div");
  streamingMessage.className = "ambient-message streaming";
  streamingMessage.hidden = true;
  streamingMessageVisible = false;
  lastStreamingFollowBottom = body?.scrollHeight || 0;
  streamingContent = document.createElement("div");
  streamingContent.className = "message-content";
  streamingMessage.append(streamingContent);
  log.append(streamingMessage);
  updateMessagePresence();
  card?.classList.add("is-streaming-response");
  streamingShouldFollow = autoScrollToBottom || !bodyCanScroll() || isBodyAtBottom(72);
  window.requestAnimationFrame(() => {
    endAmbientLayoutBatch(layoutBatch);
    updateScrollState();
  });
  return true;
}

function nextStreamingToken() {
  const remaining = streamingText.slice(streamingVisibleText.length);
  if (!remaining) return "";
  const match = remaining.match(/^(\s+|[^\s]+)(\s*)/);
  return match ? match[0] : remaining.slice(0, 1);
}

function stopStreamingRevealTimer() {
  if (!streamingRevealTimer) return;
  window.clearTimeout(streamingRevealTimer);
  streamingRevealTimer = 0;
}

function nextPaintFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function settleCompletedAssistantMessage(message, { feedback = true } = {}) {
  appendAssistantFeedbackControls(message, { enabled: feedback, reveal: feedback });
  try {
    await Promise.race([
      resizeToContent({ force: true, noShrink: true, wait: true }),
      wait(180)
    ]);
  } catch {
    // Follow-up reveal has its own resize pass; this only preserves visual order.
  }
  await nextPaintFrame();
  await nextPaintFrame();
  if (feedback) await wait(FEEDBACK_BEFORE_FOLLOWUP_MS);
}

function completeStreamingMessage() {
  if (!streamingMessage || !streamingContent) return;
  stopStreamingRevealTimer();
  if (!streamingMessageVisible) {
    setThinking(false, { resize: false, follow: false });
    streamingMessage.hidden = false;
    streamingMessageVisible = true;
  }
  renderMarkdownContent(streamingContent, streamingText);
  streamingMessage.classList.remove("streaming");
  const completedMessage = streamingMessage;
  attachFeedbackTarget(completedMessage, streamingMessageRecord);
  const callback = streamingCompleteCallback;
  card?.classList.remove("is-streaming-response");
  streamingShouldFollow = false;
  lastStreamingFollowBottom = 0;
  window.cancelAnimationFrame(streamingFollowFrame);
  streamingFollowFrame = 0;
  streamingMessage = null;
  streamingContent = null;
  streamingMessageVisible = false;
  streamingText = "";
  streamingVisibleText = "";
  streamingRenderedWordCount = 0;
  streamingFinalizing = false;
  streamingCompleteCallback = null;
  streamingMessageMetadata = null;
  streamingMessageRecord = null;
  void settleCompletedAssistantMessage(completedMessage).then(() => callback?.());
}

function renderStreamingVisibleText() {
  if (!streamingVisibleText.trim()) return;
  if (!streamingMessageVisible) {
    const layoutBatch = beginAmbientLayoutBatch();
    setThinking(false, { resize: false, follow: false });
    streamingMessage.hidden = false;
    streamingMessageVisible = true;
    window.requestAnimationFrame(() => {
      endAmbientLayoutBatch(layoutBatch);
      updateScrollState();
    });
  }
  const previousWordCount = streamingRenderedWordCount;
  streamingRenderedWordCount = renderMarkdownContent(streamingContent, streamingVisibleText, {
    animateFromWord: previousWordCount
  });
  updateScrollState();
  scheduleLiveContentResize();
  scheduleStreamingFollowScroll();
}

function revealNextStreamingToken() {
  streamingRevealTimer = 0;
  if (!streamingMessage || !streamingContent) return;

  if (streamingVisibleText.length < streamingText.length) {
    streamingVisibleText += nextStreamingToken();
    renderStreamingVisibleText();
    if (streamingVisibleText.length < streamingText.length || streamingFinalizing) {
      streamingRevealTimer = window.setTimeout(revealNextStreamingToken, STREAMING_REVEAL_DELAY_MS);
    }
    return;
  }

  if (streamingFinalizing) completeStreamingMessage();
}

function scheduleStreamingReveal(delay = STREAMING_REVEAL_DELAY_MS) {
  if (streamingRevealTimer) return;
  streamingRevealTimer = window.setTimeout(revealNextStreamingToken, delay);
}

function appendStreamingDelta(delta) {
  if (!delta || !ensureStreamingMessage()) return;
  streamingText += delta;
  scheduleStreamingReveal();
}

function finishStreamingMessage(finalText, onComplete, options = {}) {
  if (!streamingMessage || !streamingContent) return false;
  const currentText = streamingText;
  const nextText = normalizeDisplayMarkdown(finalText || "");
  if (nextText && (!streamingVisibleText || nextText.startsWith(streamingVisibleText))) {
    streamingText = nextText;
  } else if (!currentText && nextText) {
    streamingText = nextText;
  } else {
    streamingText = currentText;
  }
  streamingFinalizing = true;
  streamingCompleteCallback = onComplete || null;
  streamingMessageMetadata = options.metadata || null;
  streamingMessageRecord = options.message || options.answer || null;
  if (streamingVisibleText.length >= streamingText.length) {
    completeStreamingMessage();
  } else {
    scheduleStreamingReveal(STREAMING_REVEAL_DELAY_MS);
  }
  return true;
}

function resetStreamingMessage() {
  stopStreamingRevealTimer();
  card?.classList.remove("is-streaming-response");
  streamingShouldFollow = false;
  lastStreamingFollowBottom = 0;
  window.cancelAnimationFrame(streamingFollowFrame);
  streamingFollowFrame = 0;
  streamingMessage = null;
  streamingContent = null;
  streamingMessageVisible = false;
  streamingText = "";
  streamingVisibleText = "";
  streamingRenderedWordCount = 0;
  streamingFinalizing = false;
  streamingCompleteCallback = null;
  streamingMessageMetadata = null;
  streamingMessageRecord = null;
}

function updatePreviousMessages() {
  log.querySelectorAll(".ambient-message").forEach((item) => {
    if (item.classList.contains("thinking")) return;
    const wasPrevious = item.classList.contains("previous");

    if (!wasPrevious) {
      item.classList.add("previous");
    }

    item.classList.remove("collapsible", "expanded", "is-history-collapsing");
    item.removeAttribute("aria-expanded");
    const content = item.querySelector(".message-content");
    if (content) content.style.maxHeight = "";
    item.querySelector(".message-toggle")?.remove();
  });
}

async function focusFollowupInput() {
  if (!followupInput || followup.hidden) return;
  await window.ambient?.focus?.();
  window.focus();
  followupInput.focus({ preventScroll: true });
}

function queueFollowupFocus() {
  focusFollowupInput();
  window.setTimeout(focusFollowupInput, 80);
  window.setTimeout(focusFollowupInput, 180);
  window.setTimeout(focusFollowupInput, 360);
}

function queueCommandCenterFocus() {
  queueFollowupFocus();
  window.requestAnimationFrame(() => {
    focusFollowupInput();
    window.setTimeout(focusFollowupInput, 520);
    window.setTimeout(focusFollowupInput, 760);
  });
}

function updateFollowupPlaceholder() {
  if (!followupInput || voiceSession) return;
  followupInput.placeholder = hasAmbientMessages() ? "Ask a follow-up" : "Ask anything";
}

function revealFollowup() {
  followup.hidden = false;
  followup.classList.add("is-revealing");
  window.setTimeout(() => {
    followup.classList.remove("is-revealing");
  }, 160);
  updateFollowupPlaceholder();
  autosizeFollowup({ force: true, animate: false });
  queueFollowupFocus();
}

function ensureFollowupVisibleForTyping() {
  if (!followup) return;
  updateFollowupPlaceholder();
  followup.hidden = false;
  followup.classList.remove("is-revealing");
  autosizeFollowup({ force: true, resize: false, animate: false });
}

async function revealFollowupAfterGrow({ follow = false, lockBody = true } = {}) {
  if (!followup) return;
  updateFollowupPlaceholder();
  if (followupInput && !followupInput.value.trim()) {
    followupInput.style.height = `${FOLLOWUP_INPUT_MIN_HEIGHT}px`;
    followupInput.style.overflowY = "hidden";
    setFollowupMultiline(false);
  }
  const wasHidden = followup.hidden;
  if (wasHidden) {
    const followupHeight = measureFollowupBlockHeight();
    if (lockBody) lockBottomControlsBodyHeight();
    await setOverlayHeight(measureCardHeight() + followupHeight, {
      force: true,
      animate: true,
      duration: 170,
      noShrink: true,
      wait: true
    });
    await nextPaintFrame();
    await nextPaintFrame();
  }
  const layoutBatch = wasHidden && lockBody ? beginAmbientLayoutBatch() : null;
  followup.hidden = false;
  followup.classList.toggle("is-revealing", wasHidden);
  autosizeFollowup({ force: true, resize: !wasHidden, animate: false, noShrink: true });
  if (!wasHidden) await resizeToContent({ force: true, noShrink: true, wait: true });
  updateScrollState();
  if (wasHidden) {
    window.setTimeout(() => {
      followup.classList.remove("is-revealing");
      if (layoutBatch) endAmbientLayoutBatch(layoutBatch);
      if (lockBody) releaseBottomControlsBodyHeight({ follow });
    }, 170);
  }
  if (follow) scrollBodyToBottom();
  queueFollowupFocus();
}

async function settleAssistantCompletionLayout() {
  try {
    await Promise.race([
      resizeToContent({ force: true, noShrink: true, wait: true }),
      wait(180)
    ]);
  } catch {
    // The next resize pass will recover; this is only to sequence the UI reveal.
  }
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function renderStatusPrompt(prompt, { spinner = false } = {}) {
  const text = String(prompt || "").trim();
  status.textContent = "";
  status.setAttribute("aria-label", text);
  text.split(/\s+/).filter(Boolean).forEach((word, index, words) => {
    const span = document.createElement("span");
    span.className = "command-prompt-word";
    span.style.animationDelay = `${index * 48}ms`;
    span.textContent = word;
    status.append(span);
    if (index < words.length - 1) status.append(document.createTextNode(" "));
  });
  if (spinner) appendStatusSpinner();
}

function revealStatusPrompt(prompt, options = {}) {
  status.classList.remove("shimmer", "done");
  status.classList.remove("command-prompt-reveal");
  renderStatusPrompt(prompt, options);
  void status.offsetWidth;
  status.classList.add("command-prompt-reveal");
}

function renderCommandCenterPrompt() {
  renderStatusPrompt(commandCenterPrompt || COMMAND_CENTER_PROMPT);
}

function applyCommandCenterGreeting(userName = commandCenterUserName) {
  commandCenterUserName = cleanUserName(userName);
  if (!hasAmbientMessages() && !askingAgent && !typeTimer && !streamingMessage) {
    revealStatusPrompt(commandCenterPrompt || COMMAND_CENTER_PROMPT);
  }
}

function commandCenterPromptForMode(mode, prompt) {
  const explicitPrompt = String(prompt || "").trim();
  if (explicitPrompt) return explicitPrompt;
  return pickCommandCenterPrompt();
}

function prefillCommandCenterInput({ mode = "", prefill = "" } = {}) {
  if (!followupInput) return;
  const value = String(prefill || "");
  if (!value) return;
  followupInput.value = value;
  followupInput.setSelectionRange(value.length, value.length);
  updateMentionHighlights();
  autosizeFollowup({ force: true, animate: false });
  if (/@[A-Za-z0-9._-]+/.test(value)) triggerPrefillMentionSpotlight();
}

function clearFollowupInput({ autosize = true } = {}) {
  if (!followupInput) return;
  followupInput.value = "";
  followupInput.style.height = `${FOLLOWUP_INPUT_MIN_HEIGHT}px`;
  followupInput.style.overflowY = "hidden";
  setFollowupMultiline(false);
  followupInput.setSelectionRange(0, 0);
  updateMentionHighlights();
  clearPrefillMentionSpotlight();
  updateMentionMenu();
  if (autosize) autosizeFollowup({ force: true, resize: false, animate: false });
}

function prefillInputFromSession(session = {}) {
  const startParams = session.startParams || {};
  const prefill = String(startParams.inputPrefill || startParams.prefill || "");
  const mode = String(startParams.inputMode || "");
  if (!prefill && !mode) return;
  prefillCommandCenterInput({ mode, prefill });
}

function appendCommandCenterIntroMessage(text) {
  if (!log) return;
  const message = document.createElement("div");
  message.className = "ambient-message";
  message.dataset.commandIntro = "true";
  message.dataset.feedback = "false";

  const content = document.createElement("div");
  content.className = "message-content";
  let wordIndex = 0;

  parseMarkdown(normalizeDisplayMarkdown(text)).forEach((block) => {
    if (block.type === "table") {
      const tableState = {
        wordIndex,
        animateFromWord: 0
      };
      appendMarkdownTable(content, block, tableState);
      wordIndex = tableState.wordIndex;
      return;
    }

    if (block.type === "p") {
      const paragraph = document.createElement("p");
      tokenize(block.text).forEach((token) => {
        if (/^\s+$/.test(token)) {
          paragraph.append(document.createTextNode(token));
          return;
        }
        const span = document.createElement("span");
        span.className = "word";
        span.style.animationDelay = `${Math.min(wordIndex * 42, 840)}ms`;
        span.textContent = token;
        paragraph.append(span);
        wordIndex += 1;
      });
      content.append(paragraph);
      return;
    }

    const list = document.createElement("ul");
    block.items.forEach((item) => {
      const listItem = document.createElement("li");
      tokenize(item).forEach((token) => {
        if (/^\s+$/.test(token)) {
          listItem.append(document.createTextNode(token));
          return;
        }
        const span = document.createElement("span");
        span.className = "word";
        span.style.animationDelay = `${Math.min(wordIndex * 42, 840)}ms`;
        span.textContent = token;
        listItem.append(span);
        wordIndex += 1;
      });
      list.append(listItem);
    });
    content.append(list);
  });

  message.append(content);
  log.append(message);
  updateMessagePresence();
  resizeToContent({ force: true, noShrink: true });
}

function showCommandCenterInitialMessage(text) {
  const messageText = String(text || "").trim();
  if (!messageText || hasAmbientMessages() || typeTimer || streamingMessage) return;
  appendCommandCenterIntroMessage(messageText);
}

async function showCommandCenter({ userName = "", playSound = false, mode = "", prefill = "", prompt = "", initialMessage = "" } = {}) {
  commandCenterUserName = cleanUserName(userName || commandCenterUserName);
  commandCenterMode = String(mode || "").trim().toLowerCase();
  commandCenterPrompt = commandCenterPromptForMode(commandCenterMode, prompt);
  clearFollowupInput({ autosize: false });
  card?.classList.add("is-command-center");
  updateMessagePresence();
  applyCommandCenterGreeting(commandCenterUserName);
  updateFollowupPlaceholder();
  if (compactMode) {
    await exitCompactMode();
  } else {
    revealFollowup();
    resizeToContent({ force: true, noShrink: true });
  }
  prefillCommandCenterInput({ mode: commandCenterMode, prefill });
  showCommandCenterInitialMessage(initialMessage);
  if (playSound) playCommandCenterSound();
  queueCommandCenterFocus();
}

function revealBottomControls() {
  if (!card) return;
  card.classList.add("bottom-controls-sizing", "bottom-controls-waiting");
  actions.hidden = false;
  followup.hidden = false;
  autosizeFollowup({ force: true, animate: false });

  window.setTimeout(() => {
    card.classList.remove("bottom-controls-sizing");
    card.classList.remove("bottom-controls-waiting");
    queueFollowupFocus();
  }, 80);
}

function measureActionsBlockHeight() {
  if (!actions) return 0;
  const clone = actions.cloneNode(true);
  clone.hidden = false;
  clone.style.position = "fixed";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.display = "flex";
  document.body.append(clone);
  const styles = getComputedStyle(clone);
  const height = clone.getBoundingClientRect().height +
    (parseFloat(styles.marginTop) || 0) +
    (parseFloat(styles.marginBottom) || 0);
  clone.remove();
  return Math.ceil(height);
}

function measureFollowupBlockHeight() {
  if (!followup || !card) return 0;
  const clone = followup.cloneNode(true);
  const followupRect = followup.getBoundingClientRect();
  const cardStyles = getComputedStyle(card);
  const fallbackWidth = Math.max(
    1,
    card.getBoundingClientRect().width -
      (parseFloat(cardStyles.paddingLeft) || 0) -
      (parseFloat(cardStyles.paddingRight) || 0)
  );
  clone.hidden = false;
  clone.classList.remove("is-revealing");
  clone.style.position = "fixed";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${Math.max(1, followupRect.width || fallbackWidth)}px`;
  clone.style.display = "flex";
  clone.style.transition = "none";
  const cloneInput = clone.querySelector("[data-followup-input]");
  if (cloneInput && followupInput) {
    cloneInput.value = followupInput.value || "";
    cloneInput.placeholder = followupInput.placeholder || "";
    cloneInput.style.height = followupInput.style.height || `${FOLLOWUP_INPUT_MIN_HEIGHT}px`;
    cloneInput.style.overflowY = "hidden";
  }
  document.body.append(clone);
  const styles = getComputedStyle(clone);
  const height = clone.getBoundingClientRect().height +
    (parseFloat(styles.marginTop) || 0) +
    (parseFloat(styles.marginBottom) || 0);
  clone.remove();
  return Math.ceil(height);
}

function lockBottomControlsBodyHeight() {
  if (!card || !body) return false;
  if (bottomControlsUnlockTimer) {
    window.clearTimeout(bottomControlsUnlockTimer);
    bottomControlsUnlockTimer = null;
  }
  const bodyHeight = body.getBoundingClientRect().height || 0;
  if (!bodyHeight) return false;
  card.style.setProperty("--ambient-bottom-reveal-body-height", `${Math.max(0, Math.ceil(bodyHeight))}px`);
  card.classList.add("bottom-controls-sizing", "bottom-controls-body-locked");
  return true;
}

function releaseBottomControlsBodyHeight({ resize = true, follow = false, delay = 0 } = {}) {
  if (!card) return;
  if (bottomControlsUnlockTimer) {
    window.clearTimeout(bottomControlsUnlockTimer);
    bottomControlsUnlockTimer = null;
  }
  const release = () => {
    bottomControlsUnlockTimer = null;
    card.classList.remove("bottom-controls-sizing", "bottom-controls-body-locked");
    card.style.removeProperty("--ambient-bottom-reveal-body-height");
    if (resize) resizeToContent({ force: true, noShrink: true });
    if (follow) scrollBodyToBottom();
  };
  if (delay > 0) {
    bottomControlsUnlockTimer = window.setTimeout(release, delay);
  } else {
    release();
  }
}

async function revealActionsAfterGrow({ follow = false, layoutBatch = null, animate = true, noShrink = true } = {}) {
  if (!actions || !card) return;
  if (!actions.hidden) {
    await resizeToContent({ force: true, animate, duration: animate ? 150 : 0, noShrink, wait: true });
    if (layoutBatch) endAmbientLayoutBatch(layoutBatch);
    if (animate) releaseBottomControlsBodyHeight({ resize: false });
    if (follow) scrollBodyToBottom();
    return;
  }

  if (!animate) {
    actions.hidden = false;
    if (layoutBatch) endAmbientLayoutBatch(layoutBatch);
    await resizeToContent({ force: true, noShrink, wait: true });
    if (follow) scrollBodyToBottom();
    return;
  }

  const actionsHeight = measureActionsBlockHeight();
  lockBottomControlsBodyHeight();

  await setOverlayHeight(measureCardHeight() + actionsHeight, {
    force: true,
    animate: true,
    duration: 170,
    noShrink,
    wait: true
  });
  await nextPaintFrame();
  await nextPaintFrame();

  const activeLayoutBatch = layoutBatch || beginAmbientLayoutBatch();
  actions.hidden = false;
  window.setTimeout(() => {
    endAmbientLayoutBatch(activeLayoutBatch);
    card.classList.remove("bottom-controls-sizing");
    if (follow) scrollBodyToBottom();
    updateScrollState();
  }, 190);
}

function resetAmbientActionLabels() {
  if (ignoreButton) ignoreButton.textContent = "Ignore";
  if (alwaysAllowButton) {
    alwaysAllowButton.textContent = "Always allow";
    alwaysAllowButton.hidden = true;
  }
  if (openDraftButton) openDraftButton.textContent = "Open draft";
}

function isEditableKeyboardTarget(target) {
  if (!target) return false;
  if (target === followupInput) return true;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return Boolean(target.isContentEditable);
}

function showComputerUseApproval(computerUse) {
  pendingComputerUseApproval = computerUse || null;
  card?.classList.remove("is-computer-risk-approval");
  card?.classList.add("is-computer-approval");
  const shouldPreserveBody = Boolean(followup && !followup.hidden);
  const layoutBatch = shouldPreserveBody ? beginAmbientLayoutBatch() : null;
  if (shouldPreserveBody) lockBottomControlsBodyHeight();
  hideFollowup({ resize: false, preserveLock: shouldPreserveBody });
  setFollowupBusy(false);
  if (ignoreButton) ignoreButton.textContent = "Cancel";
  if (alwaysAllowButton) {
    alwaysAllowButton.textContent = "Always allow";
    alwaysAllowButton.hidden = false;
  }
  if (openDraftButton) openDraftButton.textContent = "Allow once";
  autoScrollToBottom = true;
  void revealActionsAfterGrow({ follow: true, layoutBatch }).then(() => updateScrollState());
}

function appendImmediateAssistantMessage(text, { feedback = false } = {}) {
  const value = String(text || "").trim();
  if (!value) return null;
  const item = document.createElement("div");
  item.className = "ambient-message";
  if (!feedback) item.dataset.feedback = "false";
  const content = document.createElement("div");
  content.className = "message-content";
  renderMarkdownContent(content, value);
  item.append(content);
  log.append(item);
  updateMessagePresence();
  autoScrollToBottom = true;
  resizeToContent({ force: true, animate: true, duration: 150 });
  window.requestAnimationFrame(() => scrollBodyToBottom());
  return item;
}

function showComputerUseCriticalApproval(payload = {}) {
  pendingComputerUseCriticalApproval = {
    decisionId: payload.decisionId,
    approvalId: payload.approvalId,
    sessionId: payload.sessionId,
    category: payload.category,
    title: payload.title,
    message: payload.message,
    actionLabel: payload.actionLabel
  };
  card?.classList.remove("is-computer-approval");
  card?.classList.add("is-computer-risk-approval");
  const title = payload.title || "Approve action?";
  const message = payload.message || "OpenArgos is about to perform an action that may be hard to undo.";
  appendImmediateAssistantMessage(`**${title}**\n\n${message}`, { feedback: false });
  hideFollowup({ resize: false, preserveLock: false });
  setFollowupBusy(true);
  if (ignoreButton) ignoreButton.textContent = "Cancel";
  if (alwaysAllowButton) {
    alwaysAllowButton.textContent = "Not allow";
    alwaysAllowButton.hidden = false;
  }
  if (openDraftButton) openDraftButton.textContent = "Approve";
  status.textContent = "Needs approval";
  status.classList.add("shimmer");
  status.classList.remove("done");
  autoScrollToBottom = true;
  void revealActionsAfterGrow({ follow: true }).then(() => updateScrollState());
}

function hideComputerUseCriticalApproval() {
  pendingComputerUseCriticalApproval = null;
  card?.classList.remove("is-computer-risk-approval");
  card?.classList.remove("bottom-controls-sizing", "bottom-controls-waiting", "bottom-controls-body-locked");
  card?.style.removeProperty("--ambient-bottom-reveal-body-height");
  resetAmbientActionLabels();
  actions.hidden = true;
}

function hideComputerUseApproval() {
  pendingComputerUseApproval = null;
  card?.classList.remove("is-computer-approval");
  card?.classList.remove("bottom-controls-sizing", "bottom-controls-waiting", "bottom-controls-body-locked");
  card?.style.removeProperty("--ambient-bottom-reveal-body-height");
  resetAmbientActionLabels();
  actions.hidden = true;
}

function hideFollowup({ resize = true, preserveLock = false } = {}) {
  if (!preserveLock) clearFollowupAutosizeLock();
  if (preserveLock) {
    card?.classList.remove("bottom-controls-waiting");
  } else {
    card?.classList.remove("bottom-controls-sizing", "bottom-controls-waiting", "bottom-controls-body-locked");
    card?.style.removeProperty("--ambient-bottom-reveal-body-height");
  }
  followup?.classList.remove("is-revealing");
  followup.hidden = true;
  if (resize) resizeToContent({ force: true });
}

function setFollowupBusy(busy) {
  askingAgent = busy;
  if (followupInput) followupInput.disabled = busy;
  if (sendButton) sendButton.disabled = busy;
  if (voiceButton) voiceButton.disabled = busy;
  followup?.classList.toggle("busy", busy);
}

function setFollowupMultiline(isMultiline) {
  followup?.classList.toggle("is-multiline", Boolean(isMultiline));
}

function measureFollowupInputHeight() {
  if (!followupInput || !followup) return FOLLOWUP_INPUT_MIN_HEIGHT;
  const rect = followupInput.getBoundingClientRect();
  const clone = followupInput.cloneNode(false);
  clone.value = followupInput.value || "";
  clone.placeholder = followupInput.placeholder || "";
  clone.style.position = "fixed";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${Math.max(1, rect.width)}px`;
  clone.style.height = "auto";
  clone.style.minHeight = `${FOLLOWUP_INPUT_MIN_HEIGHT}px`;
  clone.style.maxHeight = "none";
  clone.style.overflow = "hidden";
  clone.style.transition = "none";
  followup.append(clone);
  const nextHeight = Math.min(76, Math.max(FOLLOWUP_INPUT_MIN_HEIGHT, clone.scrollHeight));
  clone.remove();
  return nextHeight;
}

function applyFollowupInputHeight(nextHeight) {
  if (!followupInput) return;
  followupInput.style.height = `${nextHeight}px`;
  followupInput.style.overflowY = followupInput.scrollHeight > 76 ? "auto" : "hidden";
  if (followupInput.scrollHeight <= 76) followupInput.scrollTop = 0;
  setFollowupMultiline(nextHeight > FOLLOWUP_INPUT_MIN_HEIGHT + 1);
}

function clearFollowupAutosizeLock() {
  if (followupAutosizeTimer) {
    window.clearTimeout(followupAutosizeTimer);
    followupAutosizeTimer = null;
  }
  if (bottomControlsUnlockTimer) {
    window.clearTimeout(bottomControlsUnlockTimer);
    bottomControlsUnlockTimer = null;
  }
  releaseBottomControlsBodyHeight({ resize: false });
}

function autosizeFollowup({ force = false, resize = true, animate = false, noShrink = false } = {}) {
  if (!followupInput) return;
  const previousHeight = followupInput.getBoundingClientRect().height || FOLLOWUP_INPUT_MIN_HEIGHT;
  const nextHeight = measureFollowupInputHeight();
  const delta = nextHeight - previousHeight;
  const wasAtBottom = isBodyAtBottom(16) || autoScrollToBottom;
  if (resize && (force || Math.abs(delta) > 1)) {
    const bodyHeight = body?.getBoundingClientRect().height || 0;
    const targetCardHeight = measureCardHeight() + delta;
    const willBeHeightCapped = Boolean(card?.classList.contains("is-height-capped")) ||
      targetCardHeight - targetCardHeightFor(targetCardHeight) > 1;
    if (animate && bodyHeight && !willBeHeightCapped) {
      card?.style.setProperty("--ambient-bottom-reveal-body-height", `${Math.max(0, Math.ceil(bodyHeight))}px`);
      card?.classList.add("bottom-controls-sizing", "bottom-controls-body-locked");
      setLocalCardHeight(targetCardHeight);
      if (followupAutosizeTimer) window.clearTimeout(followupAutosizeTimer);
      followupAutosizeTimer = window.setTimeout(() => {
        followupAutosizeTimer = null;
        card?.classList.remove("bottom-controls-sizing", "bottom-controls-body-locked");
        card?.style.removeProperty("--ambient-bottom-reveal-body-height");
        resizeToContent({ force: true, noShrink: delta > 0 });
      }, FOLLOWUP_AUTOSIZE_MS + 40);
    } else if (animate && willBeHeightCapped) {
      card?.classList.remove("bottom-controls-sizing", "bottom-controls-body-locked");
      card?.style.removeProperty("--ambient-bottom-reveal-body-height");
      if (followupAutosizeTimer) window.clearTimeout(followupAutosizeTimer);
      followupAutosizeTimer = window.setTimeout(() => {
        followupAutosizeTimer = null;
        resizeToContent({ force: true, noShrink: delta > 0 });
      }, FOLLOWUP_AUTOSIZE_MS + 40);
    }
    applyFollowupInputHeight(nextHeight);
    if (willBeHeightCapped && wasAtBottom) {
      pinBodyToBottomDuringLayout({ frames: 6, finalDelay: FOLLOWUP_AUTOSIZE_MS + 60 });
    }
    setOverlayHeight(targetCardHeight, {
      force: true,
      animate,
      duration: animate ? FOLLOWUP_AUTOSIZE_MS : 0,
      noShrink: noShrink || delta > 0
    });
    return;
  }
  applyFollowupInputHeight(nextHeight);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMentionItems(payload = {}) {
  const merged = [
    ...(Array.isArray(payload.skills) ? payload.skills : []),
    ...(Array.isArray(payload.people) ? payload.people : [])
  ];
  const seen = new Set();
  return merged
    .filter((item) => item?.label && (item.type === "person" || item.type === "skill"))
    .map((item) => ({
      id: item.id || `${item.type}:${item.label}`,
      type: item.type,
      label: String(item.label).trim(),
      handle: String(item.handle || item.label).trim().replace(/\s+/g, ""),
      subtitle: String(item.subtitle || (item.type === "skill" ? "Skill" : "")).trim(),
      avatarUrl: item.avatarUrl || "",
      email: String(item.email || "").trim(),
      userId: item.userId || ""
    }))
    .filter((item) => {
      const key = `${item.type}:${item.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mentionItems() {
  return normalizeMentionItems(mentionSuggestions);
}

function mentionTypeForToken(token) {
  const name = String(token || "").replace(/^@/, "").toLowerCase();
  const item = mentionItems().find((entry) => entry.handle.toLowerCase() === name || entry.label.toLowerCase() === name);
  return item?.type || null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpokenMentionValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spokenMentionVariants(item) {
  const label = String(item?.label || "").trim();
  const handle = String(item?.handle || "").trim();
  const emailName = String(item?.subtitle || "").includes("@")
    ? String(item.subtitle).split("@")[0]
    : "";
  const words = label.split(/\s+/).filter(Boolean);
  return [label, handle, emailName, words[0]]
    .map(normalizeSpokenMentionValue)
    .filter((variant) => variant.length >= 2);
}

function variantCounts(items = []) {
  const counts = new Map();
  items.forEach((item) => {
    const unique = new Set(spokenMentionVariants(item));
    unique.forEach((variant) => counts.set(variant, (counts.get(variant) || 0) + 1));
  });
  return counts;
}

function replaceSpokenMention(text, item, { allowBare = false, variantCounts: counts = new Map() } = {}) {
  const handle = String(item?.handle || item?.label || "").replace(/\s+/g, "");
  if (!text || !handle || new RegExp(`(^|\\s)@${escapeRegex(handle)}\\b`, "i").test(text)) {
    return { text, replaced: false };
  }

  const variants = [...new Set(spokenMentionVariants(item))]
    .filter((variant) => {
      if (item.type !== "person") return true;
      const labelVariant = normalizeSpokenMentionValue(item.label);
      return variant === labelVariant || (counts.get(variant) || 0) <= 1;
    })
    .sort((a, b) => b.length - a.length);
  const marker = "(?:at|tag|mention|select|choose|use)";
  for (const variant of variants) {
    const words = escapeRegex(variant).replace(/\s+/g, "\\s+");
    const markedPattern = new RegExp(`(^|[\\s,.!?;:])${marker}\\s+${words}\\b`, "i");
    if (markedPattern.test(text)) {
      return {
        text: text.replace(markedPattern, (match, prefix) => `${prefix}@${handle}`),
        replaced: true
      };
    }
    if (!allowBare) continue;
    const barePattern = new RegExp(`(^|[\\s,.!?;:])${words}\\b`, "i");
    if (barePattern.test(text)) {
      return {
        text: text.replace(barePattern, (match, prefix) => `${prefix}@${handle}`),
        replaced: true
      };
    }
  }
  return { text, replaced: false };
}

function normalizeVoiceTranscriptMentions(text) {
  let next = String(text || "").replace(/\s+/g, " ").trim();
  if (!next) return "";

  const items = mentionItems();
  const skills = items.filter((item) => item.type === "skill");
  const people = items.filter((item) => item.type === "person");
  const peopleVariantCounts = variantCounts(people);
  let resolvedSkill = false;

  for (const skill of skills) {
    const result = replaceSpokenMention(next, skill, { allowBare: true });
    if (result.replaced) {
      next = result.text;
      resolvedSkill = true;
    }
  }

  for (const person of people) {
    const result = replaceSpokenMention(next, person, {
      allowBare: resolvedSkill,
      variantCounts: peopleVariantCounts
    });
    if (result.replaced) next = result.text;
  }

  if (resolvedSkill) {
    next = next
      .replace(/^(?:hey\s+openargos[, ]*)?(?:can|could|would)\s+you\s+/i, "")
      .replace(/^please\s+/i, "")
      .replace(/^(@[A-Za-z0-9._-]+(?:\s+@[A-Za-z0-9._-]+)*)\s+(?:to|then|and)\s+/i, "$1 ");
  }

  return next.replace(/\s+/g, " ").trim();
}

function clearPrefillMentionSpotlight() {
  if (prefillMentionAnimationTimer) {
    window.clearTimeout(prefillMentionAnimationTimer);
    prefillMentionAnimationTimer = null;
  }
  followupHighlight?.classList.remove("is-prefill-spotlight");
}

function triggerPrefillMentionSpotlight() {
  if (!followupHighlight) return;
  clearPrefillMentionSpotlight();
  void followupHighlight.offsetWidth;
  followupHighlight.classList.add("is-prefill-spotlight");
  prefillMentionAnimationTimer = window.setTimeout(() => {
    followupHighlight.classList.remove("is-prefill-spotlight");
    prefillMentionAnimationTimer = null;
  }, 950);
}

function updateMentionHighlights() {
  if (!followupInput || !followupHighlight) return;
  const value = followupInput.value || "";
  let hasHighlight = false;
  const html = escapeHtml(value).replace(/(^|[\s.,!?;:()[\]{}])(@[A-Za-z0-9._-]+)/g, (match, prefix, token) => {
    const type = mentionTypeForToken(token);
    if (!type) return match;
    hasHighlight = true;
    return `${prefix}<span class="mention-token mention-token-${type}">${token}</span>`;
  });
  followupHighlight.innerHTML = html || "";
  followupHighlight.classList.toggle("is-visible", hasHighlight);
  if (!hasHighlight) clearPrefillMentionSpotlight();
  followupInput.classList.toggle("has-mention-highlights", hasHighlight);
  followupHighlight.scrollTop = followupInput.scrollTop;
}

function renderUserMentionSegment(parent, token) {
  const type = mentionTypeForToken(token);
  if (!type) {
    parent.append(document.createTextNode(token));
    return false;
  }
  const mention = document.createElement("span");
  mention.className = `mention-token mention-token-${type}`;
  mention.textContent = token;
  parent.append(mention);
  return true;
}

function appendAnimatedUserText(target, value) {
  let hasMention = false;
  let wordIndex = 0;
  tokenize(value).forEach((token) => {
    if (/^\s+$/.test(token)) {
      target.append(document.createTextNode(token));
      return;
    }

    const word = document.createElement("span");
    word.className = "word user-message-word";
    word.style.animationDelay = `${Math.min(wordIndex * 22, 220)}ms`;
    wordIndex += 1;

    token.split(/(@[A-Za-z0-9._-]+)/g).filter(Boolean).forEach((part) => {
      hasMention = renderUserMentionSegment(word, part) || hasMention;
    });
    target.append(word);
  });
  return hasMention;
}

function renderUserMessageText(target, text, { animate = false } = {}) {
  if (!target) return;
  const value = String(text || "");
  if (animate) {
    target.dataset.rawText = value;
    target.textContent = "";
    const hasMention = appendAnimatedUserText(target, value);
    target.classList.toggle("has-mention-tokens", hasMention);
    return;
  }

  let hasMention = false;
  const html = escapeHtml(value).replace(/(^|[\s.,!?;:()[\]{}])(@[A-Za-z0-9._-]+)/g, (match, prefix, token) => {
    const type = mentionTypeForToken(token);
    if (!type) return match;
    hasMention = true;
    return `${prefix}<span class="mention-token mention-token-${type}">${token}</span>`;
  });
  target.dataset.rawText = value;
  target.innerHTML = html;
  target.classList.toggle("has-mention-tokens", hasMention);
}

function refreshUserMessageMentions() {
  log?.querySelectorAll(".ambient-message.user-message[data-raw-text]").forEach((message) => {
    renderUserMessageText(message, message.dataset.rawText || "");
  });
}

function getActiveMentionQuery() {
  if (!followupInput) return null;
  const cursor = followupInput.selectionStart ?? followupInput.value.length;
  if (cursor !== (followupInput.selectionEnd ?? cursor)) return null;
  const beforeCursor = followupInput.value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)@([A-Za-z0-9._-]*)$/);
  if (!match) return null;
  return {
    query: match[2] || "",
    start: cursor - match[2].length - 1,
    end: cursor
  };
}

function skillIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
      <path d="M8 9h8"></path>
      <path d="M8 13h5"></path>
    </svg>
  `;
}

function personInitials(name = "") {
  const label = String(name || "?").trim();
  return label.slice(0, 1).toUpperCase() || "?";
}

function renderMentionMenu() {
  if (!mentionMenu || !activeMentionQuery) return;
  const query = activeMentionQuery.query.toLowerCase();
  mentionMatches = mentionItems()
    .filter((item) => {
      const haystack = `${item.label} ${item.handle} ${item.subtitle}`.toLowerCase();
      return !query || haystack.includes(query);
    });

  if (!mentionMatches.length) {
    setMentionMenuHidden(true);
    return;
  }

  activeMentionIndex = Math.max(0, Math.min(activeMentionIndex, mentionMatches.length - 1));
  mentionMenu.innerHTML = mentionMatches.map((item, index) => {
    const isPerson = item.type === "person";
    const icon = isPerson && item.avatarUrl
      ? `<img src="${escapeHtml(item.avatarUrl)}" alt="" />`
      : isPerson
        ? `<span class="mention-option-initials">${escapeHtml(personInitials(item.label))}</span>`
        : skillIconSvg();
    const iconClass = isPerson ? " mention-option-icon-person" : " mention-option-icon-skill";
    const kind = item.type === "person" ? "Person" : "Skill";
    const meta = item.subtitle
      ? `<span class="mention-option-meta">${escapeHtml(item.subtitle)}</span>`
      : "";
    return `
      <button class="mention-option${index === activeMentionIndex ? " is-active" : ""}" type="button" data-mention-index="${index}">
        <span class="mention-option-icon${iconClass}">${icon}</span>
        <span class="mention-option-main">
          <span class="mention-option-name">${escapeHtml(item.label)}</span>
          ${meta}
        </span>
        <span class="mention-option-kind">${kind}</span>
      </button>
    `;
  }).join("");
  setMentionMenuHidden(false);
  window.requestAnimationFrame(() => {
    mentionMenu.querySelector(".mention-option.is-active")?.scrollIntoView({ block: "nearest" });
  });
}

function updateMentionMenu() {
  const nextQuery = getActiveMentionQuery();
  if (!nextQuery) {
    setMentionMenuHidden(true);
    mentionMatches = [];
    activeMentionIndex = 0;
    activeMentionFilter = "";
    return;
  }
  if (nextQuery.query !== activeMentionFilter) {
    activeMentionIndex = 0;
    activeMentionFilter = nextQuery.query;
  }
  activeMentionQuery = nextQuery;
  renderMentionMenu();
}

function selectMention(index = activeMentionIndex) {
  if (!followupInput || !activeMentionQuery || !mentionMatches.length) return false;
  const item = mentionMatches[index] || mentionMatches[0];
  if (!item) return false;
  const value = followupInput.value;
  const before = value.slice(0, activeMentionQuery.start);
  const after = value.slice(activeMentionQuery.end);
  const inserted = `@${item.handle} `;
  followupInput.value = `${before}${inserted}${after.replace(/^\s+/, "")}`;
  const cursor = before.length + inserted.length;
  followupInput.setSelectionRange(cursor, cursor);
  setMentionMenuHidden(true);
  activeMentionQuery = null;
  mentionMatches = [];
  activeMentionIndex = 0;
  activeMentionFilter = "";
  updateMentionHighlights();
  autosizeFollowup({ animate: false });
  followupInput.focus({ preventScroll: true });
  return true;
}

async function loadMentionSuggestions() {
  try {
    const result = await window.ambient?.listMentionSuggestions?.();
    const skills = Array.isArray(result?.skills) && result.skills.length
      ? result.skills
      : mentionFallbackSuggestions.skills;
    const people = Array.isArray(result?.people) ? result.people : [];
    mentionSuggestions = { skills, people };
  } catch {
    mentionSuggestions = mentionFallbackSuggestions;
  }
  updateMentionHighlights();
  refreshUserMessageMentions();
}

void loadMentionSuggestions();

function appendUserMessage(text, { resize = true, scroll = true } = {}) {
  const message = document.createElement("div");
  message.className = "ambient-message user-message is-new";
  message.addEventListener("animationend", () => {
    message.classList.remove("is-new");
  }, { once: true });
  renderUserMessageText(message, text, { animate: true });
  log.append(message);
  updateMessagePresence();
  autoScrollToBottom = true;
  if (resize) resizeToContent({ force: true });
  if (scroll) window.requestAnimationFrame(() => scrollBodyToBottom());
}

function computerUseActionIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.03 12.68a.5.5 0 0 1 .65-.65l8.98 3.5a.5.5 0 0 1-.03.94l-3.43 1.07a1 1 0 0 0-.66.66l-1.07 3.43a.5.5 0 0 1-.94.03Z"></path>
      <path d="M5 3a2 2 0 0 0-2 2"></path>
      <path d="M19 3a2 2 0 0 1 2 2"></path>
      <path d="M5 21a2 2 0 0 1-2-2"></path>
      <path d="M9 3h1"></path>
      <path d="M14 3h1"></path>
      <path d="M3 9v1"></path>
      <path d="M21 9v2"></path>
      <path d="M3 14v1"></path>
    </svg>
  `;
}

function actionLabelForMessage(message) {
  const actionType = message?.metadata?.actionType;
  if (actionType === "computer_use_approved") return "Allowed computer use";
  if (actionType === "computer_use_cancelled") return "Cancelled computer use";
  return String(message?.text || "Computer Use action").trim();
}

function normalizeComputerUseSteps(messageOrSteps) {
  const steps = Array.isArray(messageOrSteps)
    ? messageOrSteps
    : (Array.isArray(messageOrSteps?.metadata?.steps) ? messageOrSteps.metadata.steps : []);
  return steps
    .map((step, index) => ({
      step: Number(step?.step || index + 1),
      label: String(step?.label || "Used computer").trim(),
      status: String(step?.status || "succeeded"),
      errorMessage: step?.errorMessage ? String(step.errorMessage) : ""
    }))
    .filter((step) => step.label);
}

function computerUseStepText(step) {
  if (!step) return "";
  if (step.status === "failed" && step.errorMessage) return `${step.label} failed`;
  if (step.status === "cancelled") return `${step.label} stopped`;
  if (step.status === "needs_approval") return `${step.label} waiting`;
  if (step.status === "denied") return `${step.label} not allowed`;
  return step.label;
}

function activeComputerUseStepForDisplay(steps = [], { isActive = false } = {}) {
  const normalized = normalizeComputerUseSteps(steps);
  if (!normalized.length) return isActive
    ? { step: 0, label: "Starting computer use", status: "running", errorMessage: "" }
    : null;
  return normalized.find((step) => step.status === "running" || step.status === "needs_approval") ||
    normalized.at(-1) ||
    null;
}

function updateComputerUseCurrentStep(item, stepsInput) {
  const current = item?.querySelector(".ambient-user-action-current-step");
  if (!item || !current) return;
  const steps = normalizeComputerUseSteps(stepsInput);
  const isActive = item.classList.contains("is-computer-use-active") && item.dataset.runState !== "complete";
  const hasFailedStep = steps.some((step) => step.status === "failed");
  const displayStep = steps.find((step) => step.status === "running" || step.status === "needs_approval") ||
    steps.at(-1) ||
    (isActive ? { step: 0, label: "Starting computer use", status: "running", errorMessage: "" } : null);
  const displayText = computerUseStepText(displayStep);
  const shouldShow = Boolean(displayStep && (
    isActive ||
    hasFailedStep ||
    ["cancelled", "denied"].includes(displayStep?.status)
  ));
  const isSettledProblem = ["failed", "cancelled", "denied"].includes(displayStep?.status);
  const isLive = isActive && !hasFailedStep && !isSettledProblem;

  current.hidden = !shouldShow;
  current.classList.toggle("running", Boolean(isLive));
  current.classList.toggle("failed", Boolean(displayStep?.status === "failed"));
  current.classList.toggle("needs_approval", Boolean(displayStep?.status === "needs_approval"));
  current.classList.toggle("cancelled", Boolean(["cancelled", "denied"].includes(displayStep?.status)));
  current.querySelector(".ambient-user-action-current-text").textContent = displayText;
}

function setUserActionExpanded(item, expanded, { animate = true } = {}) {
  const shell = item?.querySelector(".ambient-user-action-steps-shell");
  const head = item?.querySelector(".ambient-user-action-head");
  if (!shell || !head) return;
  item.classList.toggle("expanded", expanded);
  head.setAttribute("aria-expanded", String(expanded));
  if (!animate) {
    shell.style.maxHeight = expanded ? "none" : "0px";
    resizeToContent({ force: true });
    window.requestAnimationFrame(() => updateScrollState());
    return;
  }
  if (expanded) {
    shell.style.maxHeight = `${shell.scrollHeight}px`;
  } else {
    shell.style.maxHeight = `${shell.scrollHeight}px`;
    shell.getBoundingClientRect();
    shell.style.maxHeight = "0px";
  }
  window.setTimeout(() => {
    if (item.classList.contains("expanded")) shell.style.maxHeight = "none";
    resizeToContent({ force: true, animate: true, duration: 150 })?.then(() => {
      if (autoScrollToBottom || item.classList.contains("expanded")) {
        scrollBodyToBottom({ force: true });
      } else {
        updateScrollState();
      }
    });
  }, 230);
}

function renderComputerUseSteps(item, stepsInput) {
  const steps = normalizeComputerUseSteps(stepsInput);
  const list = item?.querySelector(".ambient-user-action-steps");
  if (!item || !list) return;
  const isActive = item.classList.contains("is-computer-use-active") && item.dataset.runState !== "complete";
  const hasRunningStep = steps.some((step) => step.status === "running");
  const hasFailedStep = steps.some((step) => step.status === "failed");
  item.classList.toggle("has-steps", steps.length > 0 || item.dataset.actionType === "computer_use_approved");
  item.classList.toggle("is-waiting-next-step", isActive && steps.length > 0 && !hasRunningStep && !hasFailedStep);
  updateComputerUseCurrentStep(item, steps);
  list.textContent = "";
  steps.forEach((step) => {
    const row = document.createElement("li");
    row.className = `ambient-user-action-step ${step.status}`;
    row.dataset.step = String(step.step);
    row.innerHTML = `
      <span class="ambient-user-action-step-text"></span>
    `;
    row.querySelector(".ambient-user-action-step-text").textContent = computerUseStepText(step);
    list.append(row);
  });
  if (item.classList.contains("expanded")) {
    const shell = item.querySelector(".ambient-user-action-steps-shell");
    if (shell) shell.style.maxHeight = `${shell.scrollHeight}px`;
  }
}

function setActiveComputerUseActionItem(item, { approvalId = activeComputerUseApprovalId } = {}) {
  if (activeComputerUseActionItem && activeComputerUseActionItem !== item) {
    activeComputerUseActionItem.classList.remove("is-computer-use-active", "is-waiting-next-step");
  }
  activeComputerUseActionItem = item || null;
  if (activeComputerUseActionItem) {
    if (approvalId) activeComputerUseActionItem.dataset.approvalId = approvalId;
    activeComputerUseActionItem.dataset.runState = "running";
    activeComputerUseActionItem.classList.add("is-computer-use-active");
    renderComputerUseSteps(activeComputerUseActionItem, activeComputerUseActionItem._computerUseSteps || []);
  }
}

function rememberCompletedComputerUseApproval(approvalId) {
  if (!approvalId) return;
  completedComputerUseApprovalIds.add(approvalId);
  if (completedComputerUseApprovalIds.size > 24) {
    const first = completedComputerUseApprovalIds.values().next().value;
    completedComputerUseApprovalIds.delete(first);
  }
}

function clearActiveComputerUseActionItem({ settleRunningAs = "succeeded" } = {}) {
  if (pendingComputerUseCriticalApproval) hideComputerUseCriticalApproval();
  const items = new Set([
    activeComputerUseActionItem,
    ...log.querySelectorAll(".ambient-user-action.is-computer-use-active, .ambient-user-action.is-waiting-next-step, .ambient-user-action.is-stopping")
  ].filter(Boolean));

  items.forEach((item) => {
    const settledSteps = normalizeComputerUseSteps(item._computerUseSteps || [])
      .map((step) => step.status === "running" ? { ...step, status: settleRunningAs } : step);
    item._computerUseSteps = settledSteps;
    item.dataset.runState = "complete";
    rememberCompletedComputerUseApproval(item.dataset.approvalId);
    item.classList.remove("is-computer-use-active", "is-waiting-next-step", "is-stopping");
    renderComputerUseSteps(item, settledSteps);
  });

  activeComputerUseActionItem = null;
  activeComputerUseApprovalId = null;
}

function findComputerUseActionItem(approvalId = "") {
  if (approvalId) {
    const item = log.querySelector(`.ambient-user-action[data-approval-id="${CSS.escape(String(approvalId))}"]`);
    if (item) return item;
  }
  return activeComputerUseActionItem ||
    log.querySelector(".ambient-user-action.is-computer-use-active:not([data-run-state='complete'])");
}

function markComputerUseStopping(item) {
  if (!item || item.dataset.runState === "complete") return;
  item.classList.add("is-stopping");
  status.textContent = "Stopping";
  status.classList.add("shimmer");
  status.classList.remove("done");
}

function restoreComputerUseStopFailed(item) {
  if (!item || item.dataset.runState === "complete") return;
  item.classList.remove("is-stopping");
  status.textContent = "Could not stop";
  status.classList.remove("shimmer", "done");
  window.setTimeout(() => {
    if (!item.classList.contains("is-stopping") && item.dataset.runState !== "complete") {
      status.textContent = "Controlling Mac";
      status.classList.add("shimmer");
    }
  }, 1200);
}

async function requestComputerUseStop(item = findComputerUseActionItem()) {
  const approvalId = item?.dataset.approvalId || activeComputerUseApprovalId;
  if (!approvalId || item?.classList.contains("is-stopping")) return;
  if (
    pendingComputerUseCriticalApproval &&
    String(pendingComputerUseCriticalApproval.approvalId || "") === String(approvalId || "")
  ) {
    const approval = pendingComputerUseCriticalApproval;
    hideComputerUseCriticalApproval();
    void window.ambient?.decideComputerCriticalAction?.({
      decisionId: approval.decisionId,
      approvalId: approval.approvalId,
      decision: "cancel"
    });
  }
  markComputerUseStopping(item);
  const result = await window.ambient?.stopComputerUse?.({ approvalId });
  if (!result?.stopped) {
    restoreComputerUseStopFailed(item);
  }
}

function appendUserActionMessage(message, { current = false, expanded = false } = {}) {
  const actionType = message?.metadata?.actionType || "";
  const steps = normalizeComputerUseSteps(message);
  const item = document.createElement("div");
  item.className = `ambient-user-action${current ? "" : " previous"}${steps.length ? " has-steps" : ""}`;
  item.dataset.actionType = actionType;
  item.innerHTML = `
    <div class="ambient-user-action-head" role="button" tabindex="0" aria-expanded="false">
      <span class="ambient-user-action-icon">${computerUseActionIconSvg()}</span>
      <span class="ambient-user-action-text"></span>
      <span class="ambient-computer-stop-wrap">
        <button class="ambient-computer-stop" type="button" aria-label="Stop computer use" aria-describedby="computer-stop-tooltip" title="Stop computer use (${COMPUTER_STOP_SHORTCUT_LABEL})">
          <span aria-hidden="true"></span>
        </button>
      </span>
      <span class="ambient-user-action-chevron" aria-hidden="true"></span>
    </div>
    <div class="ambient-user-action-current-step" hidden>
      <span class="ambient-user-action-current-text"></span>
    </div>
    <div class="ambient-user-action-steps-shell">
      <ol class="ambient-user-action-steps"></ol>
    </div>
  `;
  item.querySelector(".ambient-user-action-text").textContent = actionLabelForMessage(message);
  const head = item.querySelector(".ambient-user-action-head");
  const stopButton = item.querySelector(".ambient-computer-stop");
  stopButton?.addEventListener("mouseenter", () => showComputerStopTooltip(stopButton));
  stopButton?.addEventListener("mouseleave", hideComputerStopTooltip);
  stopButton?.addEventListener("focus", () => showComputerStopTooltip(stopButton));
  stopButton?.addEventListener("blur", hideComputerStopTooltip);
  stopButton?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  stopButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideComputerStopTooltip();
    await requestComputerUseStop(item);
  });
  head.addEventListener("click", () => {
    if (!item.classList.contains("has-steps")) return;
    setUserActionExpanded(item, !item.classList.contains("expanded"));
    resizeToContent({ force: true, animate: true, duration: 150 })?.then(() => {
      if (autoScrollToBottom || item.classList.contains("expanded")) scrollBodyToBottom({ force: true });
    });
  });
  head.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    head.click();
  });
  renderComputerUseSteps(item, steps);
  log.append(item);
  if (expanded) setUserActionExpanded(item, true, { animate: false });
  return item;
}

function appendLocalComputerUseAction(actionType, { expanded = false, approvalId = null } = {}) {
  const item = appendUserActionMessage({
    text: actionType === "computer_use_approved" ? "Allowed computer use" : "Cancelled computer use",
    metadata: {
      kind: "user_action",
      actionType
    }
  }, { current: true, expanded });
  if (approvalId) item.dataset.approvalId = approvalId;
  if (actionType === "computer_use_approved") setActiveComputerUseActionItem(item, { approvalId });
  autoScrollToBottom = true;
  resizeToContent({ force: true });
  window.requestAnimationFrame(() => scrollBodyToBottom());
  return item;
}

function updateActiveComputerUseAction(action) {
  const approvalId = action?.approvalId || activeComputerUseApprovalId || null;
  if (approvalId && completedComputerUseApprovalIds.has(approvalId)) {
    return;
  }

  if (!activeComputerUseActionItem) {
    if (!approvalId) return;
    const item = appendUserActionMessage({
      text: "Allowed computer use",
      metadata: {
        kind: "user_action",
        actionType: "computer_use_approved",
        steps: []
      }
    }, { current: true, expanded: false });
    item.dataset.approvalId = approvalId;
    setActiveComputerUseActionItem(item, { approvalId });
  }
  if (activeComputerUseActionItem.dataset.runState === "complete") {
    return;
  }
  if (approvalId && activeComputerUseApprovalId && approvalId !== activeComputerUseApprovalId) {
    return;
  }
  const currentSteps = normalizeComputerUseSteps(activeComputerUseActionItem._computerUseSteps || []);
  const next = {
    step: Number(action?.step || currentSteps.length + 1),
    label: String(action?.label || "Used computer"),
    status: String(action?.status || "running"),
    errorMessage: action?.errorMessage ? String(action.errorMessage) : ""
  };
  const index = currentSteps.findIndex((step) => step.step === next.step);
  if (index >= 0) currentSteps[index] = next;
  else currentSteps.push(next);
  activeComputerUseActionItem._computerUseSteps = currentSteps;
  renderComputerUseSteps(activeComputerUseActionItem, currentSteps);
  autoScrollToBottom = true;
  resizeToContent({ force: true, animate: true, duration: 150 });
  window.requestAnimationFrame(() => scrollBodyToBottom());
}

function stopAmbientOutputTimers() {
  stageTimers.forEach((timer) => window.clearTimeout(timer));
  window.clearInterval(typeTimer);
  typeTimer = null;
  window.clearTimeout(typingResizeTimer);
  typingResizeTimer = null;
  stopStreamingRevealTimer();
  window.cancelAnimationFrame(resizeFrame);
  window.cancelAnimationFrame(scrollFollowFrame);
  window.cancelAnimationFrame(streamingFollowFrame);
  window.cancelAnimationFrame(liveContentResizeFrame);
  scrollFollowFrame = 0;
  streamingFollowFrame = 0;
  liveContentResizeFrame = 0;
}

function appendSessionMessage(message, { current = false } = {}) {
  const role = message?.role || "assistant";
  let text = String(message?.text || "").trim();
  if (!text) return;

  if (message?.metadata?.kind === "user_action") {
    appendUserActionMessage(message, { current });
    return;
  }

  if (role === "user") {
    const item = document.createElement("div");
    item.className = `ambient-message user-message${current ? "" : " previous"}`;
    renderUserMessageText(item, text);
    log.append(item);
    return;
  }

  const item = document.createElement("div");
  item.className = `ambient-message${current ? "" : " previous"}`;
  attachFeedbackTarget(item, message);
  if (isCommandIntroMessage(message)) {
    item.dataset.commandIntro = "true";
  }
  if (message?.metadata?.pendingComputerUseApproval || message?.metadata?.feedback === false) {
    item.dataset.feedback = "false";
  }
  const content = document.createElement("div");
  content.className = "message-content";
  renderMarkdownContent(content, text);
  item.append(content);
  const controls = appendAssistantFeedbackControls(item, {
    enabled: !message?.metadata?.pendingComputerUseApproval && message?.metadata?.feedback !== false
  });
  applyMessageFeedbackSelection(controls, messageFeedbackSelectionValue(message));
  log.append(item);
}

async function loadAmbientSession(session) {
  const threadId = session?.id || session?.threadId;
  if (!threadId) return;
  const loadToken = ++ambientSessionLoadToken;

  stopAmbientOutputTimers();
  if (voiceSession) stopVoiceInput({ restoreStatus: false });
  resetStreamingMessage();

  activeAskRequestId = null;
  streamingMessage = null;
  streamingContent = null;
  streamingMessageVisible = false;
  thinkingRow = null;
  ambientThreadId = threadId;
  commandCenterMode = "";
  commandCenterPrompt = COMMAND_CENTER_PROMPT;
  askingAgent = false;
  autoScrollToBottom = false;
  streamingShouldFollow = false;
  resetAmbientSizingForSessionLoad();
  clearFollowupInput({ autosize: false });

  card?.classList.remove("is-command-center");
  card?.classList.remove("is-streaming-response", "bottom-controls-sizing", "bottom-controls-waiting", "bottom-controls-body-locked");
  card?.style.removeProperty("--ambient-bottom-reveal-body-height");
  log.textContent = "";
  if (body) body.scrollTop = 0;
  const messages = Array.isArray(session.messages) ? session.messages : [];
  autoScrollToBottom = true;
  const latestAssistantIndex = messages[messages.length - 1]?.role === "assistant"
    ? messages.length - 1
    : -1;
  messages.forEach((message, index) => {
    if (index !== latestAssistantIndex) appendSessionMessage(message);
  });
  updatePreviousMessages();
  updateMessagePresence();
  if (latestAssistantIndex >= 0) {
    appendSessionMessage(messages[latestAssistantIndex], { current: true });
    updateMessagePresence();
  }

  actions.hidden = true;
  setFollowupBusy(false);
  setStatusText("Ready");
  revealFollowup();
  await resizeToContent({
    force: true,
    animate: true,
    duration: 180,
    noShrink: false,
    wait: true
  });
  if (loadToken !== ambientSessionLoadToken) return;
  window.setTimeout(() => {
    if (loadToken !== ambientSessionLoadToken) return;
    scrollBodyToBottom();
    queueFollowupFocus();
  }, 120);
}

function showWords(text, onComplete, options = {}) {
  const showFeedback = options.feedback !== false;
  const commandIntro = Boolean(options.commandIntro || isCommandIntroMessage(options.message || options.answer));
  window.clearInterval(typeTimer);
  window.clearTimeout(typingResizeTimer);
  typingResizeTimer = null;

  const message = document.createElement("div");
  message.className = "ambient-message";
  attachFeedbackTarget(message, options.message || options.answer);
  if (commandIntro) {
    message.dataset.commandIntro = "true";
  }
  if (!showFeedback) message.dataset.feedback = "false";
  const content = document.createElement("div");
  content.className = "message-content";
  message.append(content);
  log.append(message);
  updateMessagePresence();

  const queue = [];

  parseMarkdown(normalizeDisplayMarkdown(text)).forEach((block) => {
    if (block.type === "table") {
      queue.push({ kind: "table", block });
      return;
    }

    if (block.type === "p") {
      queue.push({ kind: "start-p" });
      parseInlineSegments(block.text).forEach((segment) => {
        if (segment.type === "link") {
          queue.push({ kind: "link", text: segment.text, url: segment.url, raw: segment.raw });
        } else if (segment.type === "local_path") {
          queue.push({ kind: "local_path", path: segment.text });
        } else if (segment.type === "code") {
          queue.push({ kind: "code", text: segment.text });
        } else if (segment.type === "strong" || segment.type === "em") {
          tokenize(segment.text).forEach((token) => queue.push({ kind: "word", token, format: segment.type }));
        } else {
          tokenize(segment.text).forEach((token) => queue.push({ kind: "word", token }));
        }
      });
      localImagePathsInText(block.text).forEach((filePath) => {
        queue.push({ kind: "local_image_preview", path: filePath });
      });
      return;
    }

    queue.push({ kind: block.type === "ol" ? "start-ol" : "start-ul" });
    block.items.forEach((item) => {
      queue.push({ kind: "start-li" });
      parseInlineSegments(item).forEach((segment) => {
        if (segment.type === "link") {
          queue.push({ kind: "link", text: segment.text, url: segment.url, raw: segment.raw });
        } else if (segment.type === "local_path") {
          queue.push({ kind: "local_path", path: segment.text });
        } else if (segment.type === "code") {
          queue.push({ kind: "code", text: segment.text });
        } else if (segment.type === "strong" || segment.type === "em") {
          tokenize(segment.text).forEach((token) => queue.push({ kind: "word", token, format: segment.type }));
        } else {
          tokenize(segment.text).forEach((token) => queue.push({ kind: "word", token }));
        }
      });
      localImagePathsInText(item).forEach((filePath) => {
        queue.push({ kind: "local_image_preview", path: filePath });
      });
    });
  });
  let index = 0;
  let target = content;
  let list = null;

  const processQueueItem = (item) => {
    if (item.kind === "start-p") {
      target = document.createElement("p");
      content.append(target);
      list = null;
    } else if (item.kind === "start-ul" || item.kind === "start-ol") {
      list = document.createElement(item.kind === "start-ol" ? "ol" : "ul");
      content.append(list);
    } else if (item.kind === "start-li") {
      target = document.createElement("li");
      list.append(target);
    } else if (item.kind === "link") {
      appendLink(target, item.text, item.url, { raw: item.raw });
    } else if (item.kind === "local_path") {
      appendLocalPathLink(target, item.path);
    } else if (item.kind === "local_image_preview") {
      appendLocalImagePreview(content, item.path);
    } else if (item.kind === "code") {
      const code = document.createElement("code");
      code.className = "word";
      code.textContent = item.text;
      target.append(code);
    } else if (item.kind === "table") {
      list = null;
      target = content;
      appendMarkdownTable(content, item.block, {
        wordIndex: 0,
        animateFromWord: 0
      });
    } else {
      appendWord(target, item.token, { format: item.format });
    }
    return null;
  };

  let queuePaused = false;
  let queueFinished = false;
  const finishQueue = () => {
    if (queueFinished) return;
    queueFinished = true;
    window.clearInterval(typeTimer);
    typeTimer = null;
    window.clearTimeout(typingResizeTimer);
    typingResizeTimer = null;
    if (commandIntro && !showFeedback) {
      void nextPaintFrame().then(() => onComplete?.());
      return;
    }
    void settleCompletedAssistantMessage(message, { feedback: showFeedback }).then(() => onComplete?.());
  };

  typeTimer = window.setInterval(() => {
    if (queuePaused) return;
    const item = queue[index];
    if (!item) return;
    const result = processQueueItem(item);
    index += 1;

    if (result && typeof result.then === "function") {
      queuePaused = true;
      result.finally(() => {
        queuePaused = false;
        scheduleTypingResize();
        if (index >= queue.length) finishQueue();
      });
      return;
    }

    scheduleTypingResize();
    if (index >= queue.length) {
      finishQueue();
    }
  }, 40);
}

function setThinking(active, { resize = true, follow = resize } = {}) {
  if (active && !thinkingRow) {
    thinkingRow = document.createElement("div");
    thinkingRow.className = "thinking";
    thinkingRow.innerHTML = "<span></span><span></span><span></span>";
    log.append(thinkingRow);
    autoScrollToBottom = true;
    if (resize) resizeToContent();
    return;
  }

  if (!active && thinkingRow) {
    thinkingRow.remove();
    thinkingRow = null;
    if (resize) resizeToContent();
    if (follow && autoScrollToBottom && !streamingMessage) scrollBodyToBottom();
  }
}

status.textContent = "Ready";
status.classList.remove("shimmer", "done", "command-prompt-reveal");
actions.hidden = true;
if (initialCommandCenter) {
  void showCommandCenter({
    userName: initialCommandCenterUserName,
    playSound: false,
    mode: initialCommandCenterMode,
    prefill: initialCommandCenterPrefill,
    prompt: initialCommandCenterPrompt,
    initialMessage: initialCommandCenterMessage
  });
} else if (deferInitialFollowup) {
  resizeToContent({ force: true });
} else {
  revealFollowup();
  resizeToContent({ force: true });
}

window.ambient?.onAskStream?.((payload) => {
  if (!payload || payload.requestId !== activeAskRequestId) return;

  if (payload.type === "status") {
    status.textContent = payload.text || "Thinking";
    status.classList.add("shimmer");
    status.classList.remove("done");
    return;
  }

  if (payload.type === "route") {
    status.textContent = payload.background
      ? "Preparing background browser"
      : payload.webSearch
        ? "Searching web"
        : payload.screenshot
          ? "Reading screen"
          : "Thinking";
    status.classList.add("shimmer");
    status.classList.remove("done");
    return;
  }

  if (payload.type === "delta") {
    appendStreamingDelta(payload.text || "");
    return;
  }

  if (payload.type === "computer_approval") {
    pendingComputerUseApproval = {
      approvalId: payload.approvalId,
      sessionId: payload.sessionId,
      task: payload.task
    };
    return;
  }

  if (payload.type === "computer_action") {
    updateActiveComputerUseAction(payload.action || {});
    return;
  }

  if (payload.type === "computer_risk_approval") {
    showComputerUseCriticalApproval(payload);
    return;
  }

  if (payload.type === "error") {
    resetStreamingMessage();
  }
});

log.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-response]");
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    void copyMessageResponse(copyButton);
    return;
  }
  const feedbackButton = event.target.closest(".message-feedback-button");
  if (!feedbackButton) return;
  if (!feedbackButton.dataset.feedbackValue) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  hideResponseFeedbackTooltip();
  const controls = feedbackButton.closest(".message-feedback");
  const value = feedbackButton.dataset.feedbackValue;
  const selected = setMessageFeedbackSelection(controls, value);
  const rating = value === "down" ? "bad" : "good";
  if (selected) void recordResponseFeedback(controls, rating);
  if (value === "up") setBadResponseModal(false);
  if (value === "down") {
    setBadResponseModal(selected, selected ? controls : null);
  }
});

log.addEventListener("mouseover", (event) => {
  const feedbackButton = event.target.closest(".message-feedback-button");
  if (feedbackButton) showResponseFeedbackTooltip(feedbackButton);
});

log.addEventListener("mouseout", (event) => {
  const feedbackButton = event.target.closest(".message-feedback-button");
  if (!feedbackButton || feedbackButton.contains(event.relatedTarget)) return;
  hideResponseFeedbackTooltip();
});

log.addEventListener("focusin", (event) => {
  const feedbackButton = event.target.closest(".message-feedback-button");
  if (feedbackButton) showResponseFeedbackTooltip(feedbackButton);
});

log.addEventListener("focusout", (event) => {
  const feedbackButton = event.target.closest(".message-feedback-button");
  if (feedbackButton) hideResponseFeedbackTooltip();
});

badResponseCancel?.addEventListener("click", () => setBadResponseModal(false));

badResponseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const controls = pendingBadResponseFeedbackTarget;
  const comment = String(badResponseInput?.value || "").trim();
  if (controls) await recordResponseFeedback(controls, "bad", comment);
  setBadResponseModal(false);
});

badResponseInfoButton?.addEventListener("mouseenter", showBadResponseInfoTooltip);
badResponseInfoButton?.addEventListener("mouseleave", hideBadResponseInfoTooltip);
badResponseInfoButton?.addEventListener("focus", showBadResponseInfoTooltip);
badResponseInfoButton?.addEventListener("blur", hideBadResponseInfoTooltip);

window.ambient?.onResumeSession?.((session) => {
  card?.classList.remove("is-command-center");
  void loadAmbientSession(session);
});

window.ambient?.onCommandCenter?.((payload = {}) => {
  void showCommandCenter(payload);
});

function handleAmbientCloseEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  if (pendingComputerUseApproval) {
    void window.ambient?.cancelComputerUse?.(pendingComputerUseApproval);
    hideComputerUseApproval();
  }
  if (pendingComputerUseCriticalApproval) {
    void window.ambient?.decideComputerCriticalAction?.({
      decisionId: pendingComputerUseCriticalApproval.decisionId,
      approvalId: pendingComputerUseCriticalApproval.approvalId,
      decision: "cancel"
    });
    hideComputerUseCriticalApproval();
  }
  dismissAmbient();
}

closeButton?.addEventListener("click", handleAmbientCloseEvent);

log.addEventListener("click", (event) => {
  const localPath = event.target.closest(".ambient-local-path, .ambient-local-image-preview");
  if (localPath) {
    event.preventDefault();
    event.stopPropagation();
    void window.ambient?.openLocalPath?.(localPath.dataset.localPath || "");
    return;
  }

  const link = event.target.closest(".ambient-link");
  if (link) {
    event.preventDefault();
    event.stopPropagation();
    void window.ambient?.openExternal?.(link.dataset.url || link.href);
    return;
  }

  const toggle = event.target.closest(".message-toggle");
  if (!toggle) return;
  const message = toggle.closest(".ambient-message.collapsible.previous");
  if (!message) return;
  const content = message.querySelector(".message-content");
  if (!content) return;

  const expanding = !message.classList.contains("expanded");
  const currentContentHeight = content.getBoundingClientRect().height;
  const targetContentHeight = expanding ? content.scrollHeight : COLLAPSED_MESSAGE_HEIGHT;
  const currentLogHeight = log.getBoundingClientRect().height;
  const targetLogHeight = currentLogHeight - currentContentHeight + targetContentHeight;

  content.style.maxHeight = `${currentContentHeight}px`;
  content.getBoundingClientRect();
  message.classList.toggle("expanded", expanding);
  message.setAttribute("aria-expanded", expanding ? "true" : "false");
  const label = message.querySelector("[data-toggle-label]");
  if (label) label.textContent = expanding ? "Less" : "More";

  window.requestAnimationFrame(() => {
    content.style.maxHeight = `${targetContentHeight}px`;
    setOverlayHeight(measureCardHeight(targetLogHeight), { force: true });
  });

  window.setTimeout(() => {
    content.style.maxHeight = expanding ? `${content.scrollHeight}px` : `${COLLAPSED_MESSAGE_HEIGHT}px`;
    resizeToContent({ force: true });
  }, 260);
});

log.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const toggle = event.target.closest(".message-toggle");
  if (!toggle) return;
  event.preventDefault();
  toggle.click();
});

function createDismissFragments(card) {
  card.querySelectorAll(".ambient-fragment").forEach((fragment) => fragment.remove());

  const rect = card.getBoundingClientRect();
  const columns = 6;
  const rows = 3;
  const pieces = columns * rows;

  for (let index = 0; index < pieces; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = 24 + column * ((rect.width - 48) / (columns - 1));
    const y = 18 + row * ((rect.height - 36) / (rows - 1));
    const centerPullX = (rect.width / 2 - x) * 0.34;
    const centerPullY = (rect.height / 2 - y) * 0.30;
    const stagger = Math.abs(column - 2.5) * 8 + row * 10;

    const fragment = document.createElement("span");
    fragment.className = "ambient-fragment";
    fragment.style.setProperty("--x", `${x}px`);
    fragment.style.setProperty("--y", `${y}px`);
    fragment.style.setProperty("--tx", `${centerPullX}px`);
    fragment.style.setProperty("--ty", `${centerPullY - 10}px`);
    fragment.style.setProperty("--rot", `${(column - 2.5) * 9 + (row - 1) * 6}deg`);
    fragment.style.setProperty("--delay", `${stagger}ms`);
    fragment.style.setProperty("--w", `${12 + ((index + row) % 3) * 4}px`);
    fragment.style.setProperty("--h", `${7 + ((index + column) % 2) * 3}px`);
    card.append(fragment);
  }
}

async function decideComputerUseCriticalAction(decision) {
  if (!pendingComputerUseCriticalApproval) return;
  const approval = pendingComputerUseCriticalApproval;
  hideComputerUseCriticalApproval();
  const acknowledgement = decision === "approve"
    ? "Approved. I’ll continue."
    : decision === "not_allow"
      ? "Not allowed. I’ll avoid that action and continue if possible."
      : "Cancelled. Stopping computer use.";
  appendImmediateAssistantMessage(acknowledgement, { feedback: false });
  const result = await window.ambient?.decideComputerCriticalAction?.({
    decisionId: approval.decisionId,
    approvalId: approval.approvalId,
    decision
  });
  if (!result?.ok) {
    appendImmediateAssistantMessage(result?.message || "That approval prompt expired.", { feedback: false });
  }
  if (decision === "cancel") {
    status.textContent = "Stopping";
    status.classList.add("shimmer");
    status.classList.remove("done");
  } else {
    status.textContent = "Controlling Mac";
    status.classList.add("shimmer");
    status.classList.remove("done");
  }
}

ignoreButton?.addEventListener("click", async () => {
  if (pendingComputerUseCriticalApproval) {
    await decideComputerUseCriticalAction("cancel");
    return;
  }
  if (pendingComputerUseApproval) {
    const approval = pendingComputerUseApproval;
    hideComputerUseApproval();
    appendLocalComputerUseAction("computer_use_cancelled");
    clearActiveComputerUseActionItem();
    await window.ambient?.cancelComputerUse?.(approval);
    status.textContent = "Cancelled";
    status.classList.remove("shimmer", "done");
    revealFollowup();
    resizeToContent({ force: true, animate: true, duration: 150 });
    return;
  }
  dismissAmbient();
});

async function runApprovedComputerUse(approval, { alwaysAllow = false } = {}) {
  const streamRequestId = activeAskRequestId || globalThis.crypto?.randomUUID?.() || `computer-${Date.now()}`;
  activeAskRequestId = streamRequestId;
  activeComputerUseApprovalId = approval?.approvalId || null;
  hideComputerUseApproval();
  hideFollowup();
  appendLocalComputerUseAction("computer_use_approved", { expanded: false, approvalId: activeComputerUseApprovalId });
  status.textContent = "Controlling Mac";
  status.classList.add("shimmer");
  status.classList.remove("done");
  setFollowupBusy(true);
  setThinking(true);

  try {
    const result = await window.ambient?.approveComputerUse?.({
      ...approval,
      streamRequestId,
      alwaysAllow
    });
    setThinking(false);
    if (!result?.ok) {
      const runError = new Error(result?.message || "Computer Use could not finish that task.");
      runError.code = result?.code;
      throw runError;
    }
    hideComputerUseCriticalApproval();
    ambientThreadId = result.threadId || ambientThreadId;
    status.textContent = "✓ Done";
    status.classList.remove("shimmer");
    status.classList.add("done");
    clearActiveComputerUseActionItem();
    showWords(result.answer?.text || result.text || "Done.", () => {
      setFollowupBusy(false);
      void settleAssistantCompletionLayout().then(() => revealFollowupAfterGrow({ follow: true }));
      activeAskRequestId = null;
    }, { message: result.answer });
  } catch (error) {
    setThinking(false);
    hideComputerUseCriticalApproval();
    const stopped = error?.code === "computer_use_cancelled" || /stopped|cancelled|canceled/i.test(error?.message || "");
    clearActiveComputerUseActionItem({ settleRunningAs: stopped ? "cancelled" : "failed" });
    status.textContent = stopped ? "Stopped" : "Issue";
    status.classList.remove("shimmer", "done");
    showWords(stopped ? "Stopped computer use." : (error?.message || "Computer Use could not finish that task."), () => {
      setFollowupBusy(false);
      void settleAssistantCompletionLayout().then(() => revealFollowupAfterGrow({ follow: true }));
      activeAskRequestId = null;
    });
  }
}

alwaysAllowButton?.addEventListener("click", async () => {
  if (pendingComputerUseCriticalApproval) {
    await decideComputerUseCriticalAction("not_allow");
    return;
  }
  if (!pendingComputerUseApproval) return;
  await runApprovedComputerUse(pendingComputerUseApproval, { alwaysAllow: true });
});

openDraftButton?.addEventListener("click", async () => {
  if (pendingComputerUseCriticalApproval) {
    await decideComputerUseCriticalAction("approve");
    return;
  }
  if (pendingComputerUseApproval) {
    await runApprovedComputerUse(pendingComputerUseApproval, { alwaysAllow: false });
    return;
  }

  status.textContent = "Opening draft";
  status.classList.add("shimmer");
  status.classList.remove("done");
  actions.hidden = true;
  hideFollowup();
  resizeToContent();
  showWords("No draft is available to open.");
});

followup?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitOptions = queuedFollowupSubmitOptions || {};
  queuedFollowupSubmitOptions = null;
  if (voiceSession) {
    if (voiceSession.finalizing) return;
    await finalizeVoiceInput();
  }
  const inputText = followupInput.value.trim();
  let text = String(submitOptions.question || inputText).trim();
  let visibleText = String(submitOptions.visibleText || inputText).trim();
  if (!text || askingAgent) return;
  const commandIntroOnlySubmit = hasOnlyCommandIntroMessages();
  const topAnchoredSubmit = shouldTopAnchorSubmitForCurrentState();
  const shouldFollowSubmit = !commandIntroOnlySubmit && !topAnchoredSubmit;

  const streamRequestId = globalThis.crypto?.randomUUID?.() || `ask-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  activeAskRequestId = streamRequestId;
  resetStreamingMessage();
  const layoutBatch = beginAmbientLayoutBatch();
  const controlsWereVisible = !commandIntroOnlySubmit && Boolean((actions && !actions.hidden) || (followup && !followup.hidden));
  const lockedSubmitBody = controlsWereVisible && card?.classList.contains("is-height-capped")
    ? lockBottomControlsBodyHeight()
    : false;
  card?.classList.add("is-submitting-message");
  hideComputerUseApproval();
  actions.hidden = true;
  status.textContent = "Thinking";
  status.classList.add("shimmer");
  status.classList.remove("done");
  setFollowupBusy(true);
  if (shouldFollowSubmit && card?.classList.contains("is-height-capped")) {
    autoScrollToBottom = true;
    pinBodyToBottomDuringLayout({ frames: 2, finalDelay: 80 });
  }
  const preparedLayoutBatch = await prepareSubmitLayout(visibleText || text, { layoutBatch });
  followupInput.value = "";
  followupInput.style.height = `${FOLLOWUP_INPUT_MIN_HEIGHT}px`;
  followupInput.style.overflowY = "hidden";
  setFollowupMultiline(false);
  updateMentionHighlights();
  updateMentionMenu();
  appendUserMessage(visibleText || text, { resize: false, scroll: false });
  if (commandIntroOnlySubmit || topAnchoredSubmit) autoScrollToBottom = false;
  setThinking(true, { resize: false });
  if (topAnchoredSubmit) autoScrollToBottom = false;
  endAmbientLayoutBatch(preparedLayoutBatch);
  const submitNeedsScrollFollow = Boolean(card?.classList.contains("is-height-capped"));
  if (shouldFollowSubmit && submitNeedsScrollFollow) {
    forceBodyToBottomNow();
    pinBodyToBottomDuringLayout({ frames: 5, finalDelay: 120 });
  }
  void Promise.resolve(resizeToContent({
    force: true,
    noShrink: true,
    animate: false,
    duration: 0,
    wait: true
  }))?.then?.(() => {
    const finishSubmitLayout = () => {
      if (lockedSubmitBody) releaseBottomControlsBodyHeight({ resize: false });
      if (commandIntroOnlySubmit || topAnchoredSubmit) {
        if (body) body.scrollTop = 0;
        updateScrollState();
        return;
      }
      if (card?.classList.contains("is-height-capped")) {
        pinBodyToBottomDuringLayout({ frames: 5, finalDelay: 160 });
      }
    };
    if (lockedSubmitBody) {
      window.setTimeout(finishSubmitLayout, 250);
      return;
    }
    finishSubmitLayout();
  })?.finally?.(() => {
    window.setTimeout(() => {
      card?.classList.remove("is-submitting-message");
    }, 80);
  });

  try {
    const result = await window.ambient?.ask?.({
      question: text,
      threadId: ambientThreadId,
      streamRequestId
    });
    setThinking(false);
    if (!result?.ok) throw new Error(result?.message || "OpenArgos could not answer that yet.");
    ambientThreadId = result.threadId || ambientThreadId;
    if (result.pendingComputerUse) {
      const approval = {
        ...(result.computerUse || {}),
        streamRequestId
      };
      status.textContent = "Permission needed";
      status.classList.remove("shimmer", "done");
      const text = result.answer?.text || "I can use your Mac to do that directly. Allow OpenArgos to continue?";
      showWords(text, () => {
        setFollowupBusy(false);
        showComputerUseApproval(approval);
      }, { feedback: false });
      return;
    }
    status.textContent = "✓ Done";
    status.classList.remove("shimmer");
    status.classList.add("done");
    if (result.autoApprovedComputerUse) {
      clearActiveComputerUseActionItem();
    }
    const answerMetadata = result.answer?.metadata || null;
    const finish = () => {
      const shouldFollow = autoScrollToBottom;
      setFollowupBusy(false);
      void settleAssistantCompletionLayout()
        .then(() => revealFollowupAfterGrow({ follow: shouldFollow }))
        .then(() => {
          if (shouldFollow) scrollBodyToBottom();
        });
      autoScrollToBottom = false;
      activeAskRequestId = null;
    };
    const streamed = finishStreamingMessage(result.answer?.text || "", finish, {
      metadata: answerMetadata,
      message: result.answer
    });
    if (streamed) {
      return;
    } else {
      showWords(result.answer?.text || "", finish, { message: result.answer });
    }
  } catch (error) {
    setThinking(false);
    clearActiveComputerUseActionItem({ settleRunningAs: "failed" });
    status.textContent = "Issue";
    status.classList.remove("shimmer");
    status.classList.remove("done");
    const finish = () => {
      const shouldFollow = autoScrollToBottom;
      setFollowupBusy(false);
      void settleAssistantCompletionLayout()
        .then(() => revealFollowupAfterGrow({ follow: shouldFollow }))
        .then(() => {
          if (shouldFollow) scrollBodyToBottom();
        });
      autoScrollToBottom = false;
      activeAskRequestId = null;
    };
    const streamed = finishStreamingMessage(undefined, finish);
    if (streamed) {
      return;
    } else {
      showWords(error?.message || "OpenArgos could not answer that yet.", finish);
    }
  }
});

function setVoiceTranscriptInputValue(value) {
  if (!followupInput) return;
  followupInput.value = String(value || "");
  autosizeFollowup({ animate: true, noShrink: true });
  updateMentionHighlights();
  updateMentionMenu();
}

function stopVoiceInput({ restoreStatus = true } = {}) {
  if (!voiceSession) return;
  voiceShortcutHeld = false;
  const previousStatus = voiceSession.previousStatus;
  if (voiceSession.commitTimer) window.clearInterval(voiceSession.commitTimer);
  if (voiceSession.levelTimer) window.clearInterval(voiceSession.levelTimer);
  if (voiceSession.nativeCapture) {
    void window.ambient?.stopVoiceCapture?.({ discard: true });
  }
  if (voiceSession.recorder?.state === "recording") {
    voiceSession.recorder.stop();
  }
  voiceSession.stream?.getTracks().forEach((track) => track.stop());
  voiceSession.audioContext?.close?.();
  voiceSession = null;

  voiceButton?.classList.remove("listening", "connecting", "processing");
  voiceButton?.removeAttribute("aria-pressed");
  if (voiceButton) voiceButton.disabled = false;
  applyVoiceTranscriptionSettings(currentVoiceTranscriptionSettings());
  updateFollowupPlaceholder();
  if (restoreStatus) applyStatusState(previousStatus);
  queueFollowupFocus();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function voiceStatsForLog(audioStats = {}) {
  return {
    native: Boolean(audioStats.native),
    browser: Boolean(audioStats.browser),
    inputDeviceName: audioStats.inputDeviceName || null,
    maxAveragePower: Number.isFinite(audioStats.maxAveragePower) ? audioStats.maxAveragePower : null,
    maxPeakPower: Number.isFinite(audioStats.maxPeakPower) ? audioStats.maxPeakPower : null,
    maxRms: Number(audioStats.maxRms || 0) || null,
    maxPeak: Number(audioStats.maxPeak || 0) || null,
    samples: Number(audioStats.samples || 0) || null
  };
}

function voiceAudioStatsLookDead(audioStats = {}) {
  const samples = Number(audioStats.samples || 0);
  if (samples < 3) return false;
  const peakPower = Number(audioStats.maxPeakPower);
  if (Number.isFinite(peakPower) && peakPower <= -115) return true;
  const maxRms = Number(audioStats.maxRms || 0);
  const maxPeak = Number(audioStats.maxPeak || 0);
  return maxRms <= DEAD_AUDIO_LEVEL && maxPeak <= DEAD_AUDIO_LEVEL;
}

function noMicrophoneInputMessage(audioStats = {}) {
  return audioStats.inputDeviceName
    ? `No microphone input detected from ${audioStats.inputDeviceName}`
    : "No microphone input detected";
}

function rememberNativeVoiceSilentInput(audioStats = {}) {
  nativeVoiceSilenceFailures += 1;
  nativeVoiceFallbackUntil = Date.now() + NATIVE_VOICE_FALLBACK_MS;
  logVoice("native_recording_silent_input", {
    ...voiceStatsForLog(audioStats),
    failures: nativeVoiceSilenceFailures,
    fallbackMs: NATIVE_VOICE_FALLBACK_MS
  });
}

function shouldUseBrowserVoiceCapture() {
  return Date.now() < nativeVoiceFallbackUntil;
}

function mediaRecorderMimeType() {
  const supported = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4"
  ];
  return supported.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function enterVoiceListeningState(session) {
  if (voiceSession !== session) return false;
  voiceButton.classList.remove("connecting");
  voiceButton.classList.add("listening");
  followupInput.placeholder = "Listening...";
  setVoiceStatus("Listening");
  queueFollowupFocus();
  return true;
}

async function startBrowserVoiceCapture(session, reason = "fallback") {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error("Browser voice capture is unavailable");
  }

  logVoice("browser_recording_starting", { reason });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  if (voiceSession !== session) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }

  const mimeType = mediaRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let analyser = null;
  let levelBuffer = null;

  if (AudioContextClass) {
    audioContext = new AudioContextClass();
    await audioContext.resume?.().catch(() => {});
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    levelBuffer = new Float32Array(analyser.fftSize);
    const sampleLevel = () => {
      if (!analyser || !levelBuffer || voiceSession !== session) return;
      analyser.getFloatTimeDomainData(levelBuffer);
      let sum = 0;
      let peak = 0;
      for (const value of levelBuffer) {
        const abs = Math.abs(value);
        sum += value * value;
        if (abs > peak) peak = abs;
      }
      const rms = Math.sqrt(sum / levelBuffer.length);
      session.maxRms = Math.max(session.maxRms || 0, rms);
      session.maxPeak = Math.max(session.maxPeak || 0, peak);
      session.levelSamples = Number(session.levelSamples || 0) + 1;
    };
    sampleLevel();
    session.levelTimer = window.setInterval(sampleLevel, 100);
  }

  session.browserCapture = true;
  session.nativeCapture = false;
  session.stream = stream;
  session.audioContext = audioContext;
  session.recorder = recorder;
  session.mimeType = recorder.mimeType || mimeType || "audio/webm";
  session.stopped = new Promise((resolve) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) session.chunks.push(event.data);
    });
    recorder.addEventListener("stop", resolve, { once: true });
  });
  recorder.start(250);
  logVoice("browser_recording_started", { mimeType: session.mimeType, reason });

  if (session.pushToTalk && (session.releaseRequested || !voiceShortcutHeld)) {
    void finalizeVoiceInput();
    return;
  }
  enterVoiceListeningState(session);
}

function finishVoiceInputWithNotice(session, message, statusText = message) {
  if (voiceSession !== session) return;
  const previousStatus = session.previousStatus;
  session.stream?.getTracks().forEach((track) => track.stop());
  session.audioContext?.close?.();
  voiceShortcutHeld = false;
  voiceSession = null;
  voiceButton?.classList.remove("listening", "connecting", "processing");
  voiceButton?.removeAttribute("aria-pressed");
  if (voiceButton) voiceButton.disabled = false;
  applyVoiceTranscriptionSettings(currentVoiceTranscriptionSettings());
  setVoiceStatus(statusText, { shimmer: false });
  if (followupInput) followupInput.placeholder = message;
  window.setTimeout(() => {
    if (!voiceSession) {
      updateFollowupPlaceholder();
      applyStatusState(previousStatus);
    }
  }, 1800);
  queueFollowupFocus();
}

async function finalizeVoiceInput() {
  if (!voiceSession || voiceSession.finalizing) return;
  const session = voiceSession;
  session.finalizing = true;
  hideVoiceTooltip();

  if (session.commitTimer) window.clearInterval(session.commitTimer);
  if (session.levelTimer) window.clearInterval(session.levelTimer);

  voiceButton?.classList.remove("listening", "connecting");
  voiceButton?.classList.add("processing");
  voiceButton?.setAttribute("aria-label", "Transcribing voice");
  if (voiceButton) voiceButton.disabled = true;
  if (followupInput) followupInput.placeholder = "Transcribing...";
  setVoiceStatus("Transcribing");

  try {
    let upload;
    if (session.nativeCapture) {
      const capture = await window.ambient?.stopVoiceCapture?.();
      if (voiceSession !== session) return;
      if (!capture?.ok) {
        throw new Error(capture?.message || "No audio was recorded.");
      }
      upload = {
        audioBuffer: capture.audioBuffer,
        mimeType: capture.mimeType || "audio/m4a",
        durationMs: capture.durationMs || Date.now() - session.startedAt,
        audioStats: capture.audioStats || { native: true }
      };
      logVoice("recording_ready", {
        mimeType: upload.mimeType,
        size: capture.audioBuffer?.byteLength || capture.audioBuffer?.length || 0,
        durationMs: upload.durationMs,
        native: true,
        inputDeviceName: capture.inputDeviceName || upload.audioStats?.inputDeviceName || null,
        maxRms: Number(upload.audioStats?.maxRms || 0) || null,
        maxPeak: Number(upload.audioStats?.maxPeak || 0) || null,
        samples: Number(upload.audioStats?.samples || 0) || null
      });
      if (voiceAudioStatsLookDead(upload.audioStats)) {
        rememberNativeVoiceSilentInput(upload.audioStats);
        finishVoiceInputWithNotice(
          session,
          `${noMicrophoneInputMessage(upload.audioStats)}. I’ll use the fallback recorder next time`,
          "Mic input silent"
        );
        return;
      }
    } else {
      if (session.recorder?.state === "recording") {
        session.recorder.stop();
      }
      session.stream?.getTracks().forEach((track) => track.stop());
      await session.stopped;

      if (voiceSession !== session) return;
      const audioBlob = new Blob(session.chunks, { type: session.mimeType || "audio/webm" });
      logVoice("recording_ready", {
        mimeType: audioBlob.type,
        size: audioBlob.size,
        durationMs: Date.now() - session.startedAt
      });
      if (!audioBlob.size) {
        throw new Error("No audio was recorded.");
      }
      upload = {
        audioBuffer: await audioBlob.arrayBuffer(),
        mimeType: audioBlob.type,
        durationMs: Date.now() - session.startedAt,
        audioStats: {
          browser: true,
          maxRms: session.maxRms || 0,
          maxPeak: session.maxPeak || 0,
          samples: session.levelSamples || 0
        }
      };
    }

    const result = await window.ambient?.transcribeVoice?.(upload);
    logVoice("transcribe_result", {
      ok: Boolean(result?.ok),
      code: result?.code || null,
      message: result?.message || null,
      provider: result?.provider || null,
      model: result?.model || null,
      textLength: result?.text?.length || 0
    });
    if (!result?.ok && (result?.code === "no_speech_detected" || result?.code === "no_microphone_input")) {
      logVoice(result.code, voiceStatsForLog(upload.audioStats));
      finishVoiceInputWithNotice(
        session,
        result.message || (result.code === "no_microphone_input" ? "No microphone input detected" : "No speech detected."),
        result.code === "no_microphone_input" ? "Mic input silent" : "No speech detected"
      );
      return;
    } else if (!result?.ok) {
      throw new Error(result?.message || "Voice transcription failed.");
    }

    if (followupInput && result.text?.trim()) {
      setVoiceTranscriptInputValue([session.baseText, normalizeVoiceTranscriptMentions(result.text)].filter(Boolean).join(" "));
    }

    const previousStatus = session.previousStatus;
    session.audioContext?.close?.();
    voiceShortcutHeld = false;
    voiceSession = null;
    voiceButton?.classList.remove("listening", "connecting", "processing");
    voiceButton?.removeAttribute("aria-pressed");
    if (voiceButton) voiceButton.disabled = false;
    applyVoiceTranscriptionSettings(currentVoiceTranscriptionSettings());
    updateFollowupPlaceholder();
    applyStatusState(previousStatus);
    queueFollowupFocus();
  } catch (error) {
    failVoiceInput(error?.message || "Voice transcription failed.");
  }
}

function failVoiceInput(message) {
  logVoice("failed", { message: message || "Voice unavailable" });
  const previousStatus = voiceSession?.previousStatus;
  stopVoiceInput({ restoreStatus: false });
  setVoiceStatus("Voice unavailable", { shimmer: false });
  if (followupInput) {
    followupInput.placeholder = message || "Voice is not set up yet";
  }
  window.setTimeout(() => {
    if (!voiceSession) {
      updateFollowupPlaceholder();
      applyStatusState(previousStatus);
    }
  }, 2400);
}

async function startVoiceInput(options = {}) {
  hideVoiceTooltip();
  if (voiceSession) return;
  const pushToTalk = Boolean(options.pushToTalk);
  logVoice("start_clicked", {
    source: options.source || (pushToTalk ? "shortcut" : "button"),
    pushToTalk
  });

  voiceSession = {
    previousStatus: getStatusState(),
    baseText: followupInput.value.trim(),
    startedAt: Date.now(),
    pushToTalk,
    releaseRequested: false,
    chunks: [],
    maxRms: 0,
    maxPeak: 0,
    levelSamples: 0,
    finalizing: false
  };
  const session = voiceSession;

  voiceButton.classList.add("connecting");
  voiceButton.setAttribute("aria-pressed", "true");
  voiceButton.setAttribute("aria-label", "Stop recording");
  followupInput.placeholder = "Starting voice...";
  setVoiceStatus("Starting voice");

  try {
    if (shouldUseBrowserVoiceCapture()) {
      try {
        await startBrowserVoiceCapture(session, "native_silent_recently");
      } catch (fallbackError) {
        logVoice("browser_recording_exception", {
          reason: "native_silent_recently",
          message: fallbackError?.message || "Could not start fallback voice capture"
        });
        failVoiceInput(fallbackError?.message || "Could not start voice capture");
      }
      return;
    }

    const nativeResult = await window.ambient?.startVoiceCapture?.();
    if (nativeResult?.ok) {
      session.nativeCapture = true;
      session.mimeType = nativeResult.mimeType || "audio/m4a";
      logVoice("native_recording_started", { mimeType: session.mimeType });
      if (voiceSession !== session) return;
      if (session.pushToTalk && (session.releaseRequested || !voiceShortcutHeld)) {
        void finalizeVoiceInput();
        return;
      }
      enterVoiceListeningState(session);
      return;
    }
    logVoice("native_recording_unavailable", {
      code: nativeResult?.code || null,
      message: nativeResult?.message || null
    });
    if (nativeResult?.code === "microphone_blocked") {
      failVoiceInput(nativeResult.message || "Microphone access is blocked");
      return;
    }
    try {
      await startBrowserVoiceCapture(session, nativeResult?.code || "native_unavailable");
      return;
    } catch (fallbackError) {
      logVoice("browser_recording_exception", {
        reason: nativeResult?.code || "native_unavailable",
        message: fallbackError?.message || "Could not start fallback voice capture"
      });
    }
    failVoiceInput(nativeResult?.message || "Native voice capture is unavailable.");
    return;
  } catch (error) {
    logVoice("native_recording_exception", { message: error?.message || "Could not start native voice capture" });
    try {
      await startBrowserVoiceCapture(session, "native_exception");
      return;
    } catch (fallbackError) {
      logVoice("browser_recording_exception", {
        reason: "native_exception",
        message: fallbackError?.message || "Could not start fallback voice capture"
      });
    }
    failVoiceInput(error?.message || "Could not start native voice capture");
    return;
  }
}

function voiceStartBlockers() {
  const blockers = [];
  if (!voiceButton) blockers.push("missing_voice_button");
  if (voiceTranscriptionBlockReason()) blockers.push("voice_transcription_unavailable");
  if (voiceButton?.disabled) blockers.push("voice_button_disabled");
  if (askingAgent) blockers.push("asking_agent");
  if (pendingComputerUseApproval) blockers.push("pending_computer_use_approval");
  if (pendingComputerUseCriticalApproval) blockers.push("pending_computer_use_critical_approval");
  if (followup?.hidden) blockers.push("followup_hidden");
  return blockers;
}

function toggleVoiceInput() {
  if (voiceSession) {
    if (!voiceSession.nativeCapture && !voiceSession.recorder) {
      voiceSession.releaseRequested = true;
      logVoice("stop_deferred_until_voice_ready", { source: "button" });
      return;
    }
    void finalizeVoiceInput();
    return;
  }

  const blockers = voiceStartBlockers();
  if (blockers.length) {
    logVoice("start_ignored", { source: "button", blockers });
    return;
  }
  void startVoiceInput();
}

function beginVoiceShortcutRecording(source = "keyboard") {
  voiceShortcutHeld = true;
  if (voiceSession) return;
  const blockers = voiceStartBlockers();
  if (blockers.length) {
    logVoice("start_ignored", { source, pushToTalk: true, blockers });
    return;
  }
  void startVoiceInput({ pushToTalk: true, source });
}

function endVoiceShortcutRecording() {
  voiceShortcutHeld = false;
  if (!voiceSession?.pushToTalk || voiceSession.finalizing) return;
  if (voiceSession.nativeCapture || voiceSession.recorder?.state === "recording") {
    void finalizeVoiceInput();
    return;
  }
  voiceSession.releaseRequested = true;
}

function shortcutLabelForAccelerator(accelerator = "") {
  const symbols = {
    Command: "⌘",
    Control: "⌃",
    Alt: "⌥",
    Shift: "⇧",
    Super: "◆",
    CommandOrControl: navigator.platform?.toLowerCase().includes("mac") ? "⌘" : "Ctrl"
  };
  return String(accelerator || "")
    .split("+")
    .filter(Boolean)
    .map((part) => symbols[part] || (part === "Space" ? "Space" : part))
    .join("");
}

function shortcutKeyMatchesEvent(key, event) {
  const value = String(key || "");
  const eventKey = String(event.key || "");
  const code = String(event.code || "");
  if (value.length === 1) return eventKey.toLowerCase() === value.toLowerCase() || code === `Key${value.toUpperCase()}` || code === `Digit${value}`;
  if (value === "Space") return code === "Space" || eventKey === " ";
  if (value === ".") return code === "Period" || eventKey === ".";
  if (value === ",") return code === "Comma" || eventKey === ",";
  if (value === "-") return code === "Minus" || eventKey === "-";
  if (value === "Plus") return code === "Equal" || eventKey === "+";
  return eventKey.toLowerCase() === value.toLowerCase() || code.toLowerCase() === value.toLowerCase();
}

function shortcutMatchesEvent(accelerator, event) {
  const parts = String(accelerator || "").split("+").filter(Boolean);
  const key = parts.at(-1);
  const modifiers = new Set(parts.slice(0, -1));
  const wantsCommand = modifiers.has("Command") || modifiers.has("CommandOrControl");
  const wantsControl = modifiers.has("Control") || (modifiers.has("CommandOrControl") && !navigator.platform?.toLowerCase().includes("mac"));
  return Boolean(key) &&
    event.metaKey === wantsCommand &&
    event.ctrlKey === wantsControl &&
    event.altKey === modifiers.has("Alt") &&
    event.shiftKey === modifiers.has("Shift") &&
    shortcutKeyMatchesEvent(key, event);
}

function shortcutReleaseMatchesEvent(accelerator, event) {
  const parts = String(accelerator || "").split("+").filter(Boolean);
  const key = parts.at(-1);
  const keyReleased = shortcutKeyMatchesEvent(key, event);
  const modifierReleased = (
    (parts.includes("Command") && ["Meta", "OS"].includes(event.key)) ||
    (parts.includes("Control") && event.key === "Control") ||
    (parts.includes("Alt") && ["Alt", "Option"].includes(event.key)) ||
    (parts.includes("Shift") && event.key === "Shift")
  );
  return voiceShortcutHeld && (keyReleased || modifierReleased);
}

function applyShortcutSettings(payload = {}) {
  const shortcuts = payload.shortcuts || payload;
  voiceShortcutAccelerator = shortcuts?.voiceRecording || "Alt+M";
  voiceShortcutLabel = payload.labels?.voiceRecording || shortcutLabelForAccelerator(voiceShortcutAccelerator);
  applyVoiceTranscriptionSettings(currentVoiceTranscriptionSettings());
}

function isVoiceShortcut(event) {
  return shortcutMatchesEvent(voiceShortcutAccelerator, event);
}

function isVoiceShortcutRelease(event) {
  return shortcutReleaseMatchesEvent(voiceShortcutAccelerator, event);
}

function isComputerStopShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  return event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    (key === "." || event.code === "Period");
}

voiceButton?.setAttribute("title", `Record voice (${voiceShortcutLabel})`);
voiceButton?.addEventListener("click", toggleVoiceInput);
window.ambient?.getVoiceTranscriptionSettings?.()
  .then((payload) => {
    if (payload?.ok) applyVoiceTranscriptionSettings(payload);
  })
  .catch(() => applyVoiceTranscriptionSettings({ enabled: false, provider: "", hasOpenAIKey: false, hasGroqKey: false }));
window.ambient?.onVoiceTranscriptionSettingsChanged?.(applyVoiceTranscriptionSettings);
window.ambient?.getShortcuts?.().then((payload) => {
  if (payload?.shortcuts) applyShortcutSettings(payload);
}).catch(() => {});
window.ambient?.onShortcutsChanged?.(applyShortcutSettings);
window.ambient?.onVoiceShortcut?.((payload = {}) => {
  if (payload?.phase === "up") {
    endVoiceShortcutRecording();
    return;
  }
  beginVoiceShortcutRecording(payload?.source || (payload?.mode === "push-to-talk" ? "global-shortcut" : "shortcut"));
});
window.ambient?.onComputerStopShortcut?.((payload = {}) => {
  const item = findComputerUseActionItem(payload.approvalId);
  markComputerUseStopping(item);
});

followupInput?.addEventListener("paste", () => {
  followupPastePending = true;
});
followupInput?.addEventListener("input", (event) => {
  const isPaste = followupPastePending || event?.inputType === "insertFromPaste";
  followupPastePending = false;
  autosizeFollowup({ force: isPaste, animate: true });
  updateMentionHighlights();
  updateMentionMenu();
});
followupInput?.addEventListener("focus", () => {
  autosizeFollowup({ resize: false });
  updateMentionHighlights();
  updateMentionMenu();
});
followupInput?.addEventListener("click", updateMentionMenu);
followupInput?.addEventListener("keyup", (event) => {
  if (["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(event.key)) return;
  updateMentionMenu();
});
followupInput?.addEventListener("scroll", () => {
  if (followupHighlight) followupHighlight.scrollTop = followupInput.scrollTop;
});
mentionMenu?.addEventListener("pointerdown", (event) => {
  const option = event.target.closest("[data-mention-index]");
  if (!option) return;
  event.preventDefault();
  selectMention(Number(option.dataset.mentionIndex || 0));
});
document.addEventListener("pointerdown", (event) => {
  if (!mentionMenu || mentionMenu.hidden) return;
  if (event.target === followupInput || mentionMenu.contains(event.target)) return;
  setMentionMenuHidden(true);
});
followupInput?.addEventListener("keydown", (event) => {
  if (activeMentionQuery && mentionMatches.length) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeMentionIndex = (activeMentionIndex + 1) % mentionMatches.length;
      renderMentionMenu();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeMentionIndex = (activeMentionIndex - 1 + mentionMatches.length) % mentionMatches.length;
      renderMentionMenu();
      return;
    }
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      selectMention();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setMentionMenuHidden(true);
      activeMentionQuery = null;
      activeMentionFilter = "";
      return;
    }
  }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    followup.requestSubmit();
  }
});

window.addEventListener("keydown", (event) => {
  if (isComputerStopShortcut(event) && !event.repeat) {
    event.preventDefault();
    event.stopPropagation();
    void requestComputerUseStop();
    return;
  }
  if (!isVoiceShortcut(event) || event.repeat) return;
  event.preventDefault();
  event.stopPropagation();
  beginVoiceShortcutRecording("keyboard");
});

window.addEventListener("keyup", (event) => {
  if (!isVoiceShortcutRelease(event)) return;
  event.preventDefault();
  event.stopPropagation();
  endVoiceShortcutRecording();
});

window.addEventListener("blur", () => {
  if (voiceSession?.pushToTalk) {
    endVoiceShortcutRecording();
  }
});

voiceButton?.addEventListener("mouseenter", () => {
  showVoiceTooltip();
});
voiceButton?.addEventListener("mouseleave", hideVoiceTooltip);
voiceButton?.addEventListener("focus", () => {
  showVoiceTooltip();
});
voiceButton?.addEventListener("blur", hideVoiceTooltip);

window.addEventListener("load", resizeToContent);
window.addEventListener("resize", () => {
  positionVoiceTooltip();
});
body?.addEventListener("scroll", handleBodyScroll);
body?.addEventListener("wheel", handleBodyWheel, { passive: true });
body?.addEventListener("keydown", handleBodyKeydown);

const contentObserver = new ResizeObserver(() => {
  if (suppressContentObserverResize) {
    updateScrollState();
    return;
  }
  if (streamingMessage || typeTimer) {
    updateScrollState();
    scheduleLiveContentResize();
    return;
  }
  resizeToContent();
});
contentObserver.observe(log);
contentObserver.observe(actions);
contentObserver.observe(followup);
document.fonts?.ready?.then(() => resizeToContent({ force: true }));
