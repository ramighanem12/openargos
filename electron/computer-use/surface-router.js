"use strict";

function createComputerUseSurfaceRouter({
  normalizeComputerIntentText,
  extractPublicImageDownloadSubject,
  extractLeadershipRoleQuery,
  extractComputerUseUrlFromTask,
  initialBackgroundBrowserUrlForTask
} = {}) {
  const normalizeIntent = typeof normalizeComputerIntentText === "function"
    ? normalizeComputerIntentText
    : (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

  function taskTargetsOpenArgosApp(task = "") {
    const text = normalizeIntent(task);
    if (!/\bopenargos\b/.test(text)) return false;
    if (/\bambient\s+(?:card|window|panel|message|input)\b/.test(text)) return false;
    return /\b(app|desktop|settings|setting|tab|model|models|dropdown|account|memory|appearance|theme|general|provider|key|keys)\b/.test(text);
  }

  function taskRequiresUserBrowserSession(task = "") {
    const text = normalizeIntent(task);
    if (extractPublicImageDownloadSubject?.(text) || extractLeadershipRoleQuery?.(text)) return false;
    return /\b(doordash|door\s*dash|uber\s*eats|ubereats|instacart|amazon|prime\s*video|primevideo|netflix|hulu|gmail|google\s+docs?|google\s+sheets?|google\s+slides?|calendar|slack|notion|figma|linear|jira|github|stripe|shopify|linkedin|twitter|x\.com|telegram|whatsapp|bank|billing|checkout|cart|order|reorder|re-order|buy|purchase|payment|login|log\s+in|sign\s+in|account)\b/.test(text);
  }

  function taskTargetsNativeApp(task = "") {
    const text = normalizeIntent(task);
    if (taskTargetsOpenArgosApp(text)) return true;
    return /\b(finder|dock|desktop|system settings|settings app|terminal|iterm|xcode|cursor|vscode|visual studio code|preview|photos|notes|mail|calendar app|messages|slack app|telegram app|spotify|music|zoom|meet|teams|keynote|pages|numbers|word|excel|powerpoint)\b/.test(text);
  }

  function taskTargetsBrowserSession(task = "") {
    const text = normalizeIntent(task);
    return taskRequiresUserBrowserSession(text) ||
      /\b(?:in|inside|using|with|use|open|switch to)\s+(?:chrome|safari|arc|edge|firefox|my browser|current browser|this browser|this tab|current tab)\b/.test(text);
  }

  function taskRequestsBackgroundBrowser(task = "") {
    const text = normalizeIntent(task);
    return /\b(?:in|using|with)\s+(?:the\s+)?(?:background|hidden|isolated)\s+browser\b/.test(text) ||
      /\b(?:run|do|handle|open)\s+(?:this|that|it|the task)?\s*(?:in\s+)?(?:the\s+)?background\b/.test(text) ||
      /\bwithout\s+(?:taking\s+over|using)\s+(?:my\s+|the\s+)?(?:screen|chrome|browser|desktop)\b/.test(text) ||
      /\bdon'?t\s+take\s+over\s+(?:my\s+|the\s+)?(?:screen|chrome|browser|desktop)\b/.test(text);
  }

  function taskLooksLikePublicWebTask(task = "") {
    const text = normalizeIntent(task);
    return /\b(web|website|site|browser|page|google|search|internet|online|wikipedia|youtube|reddit|news)\b/.test(text) ||
      /\b(?:image|images|picture|pictures|photo|photos|logo|logos|icon|icons|article|bio|biography|profile|public page|public website)\b/.test(text) ||
      /\b(?:hours?|open now|closest|near me|nearby|location|locations|store|restaurant|directions?|maps?)\b/.test(text);
  }

  function resolveAdapterPlan(task = "", context = {}) {
    const text = normalizeIntent(task);
    const hasWebTarget = Boolean(extractComputerUseUrlFromTask?.(task)) ||
      Boolean(extractPublicImageDownloadSubject?.(task)) ||
      taskLooksLikePublicWebTask(text);
    const mustUseLiveBrowserSession = taskTargetsBrowserSession(task);
    const canUseBackgroundBrowser = (hasWebTarget || taskRequestsBackgroundBrowser(task)) &&
      !taskRequiresUserBrowserSession(task) &&
      !taskTargetsNativeApp(task) &&
      !mustUseLiveBrowserSession;
    if (canUseBackgroundBrowser) {
      return {
        kind: "browser",
        label: "Background browser",
        background: true,
        reason: taskRequestsBackgroundBrowser(task)
          ? "user requested background browser and the task does not require a signed-in browser session"
          : "public web task without required user-browser session",
        initialUrl: initialBackgroundBrowserUrlForTask?.(task) || ""
      };
    }
    return {
      kind: "native",
      label: "Live Mac",
      background: false,
      reason: taskRequiresUserBrowserSession(task)
        ? "task likely needs the user's signed-in browser or account state"
        : taskTargetsNativeApp(task)
          ? "task targets a native app or current desktop UI"
          : "task needs the visible Mac environment",
      activeApp: context?.activeApp || "",
      activeWindowTitle: context?.activeWindowTitle || "",
      browserTitle: context?.browserTitle || "",
      browserUrl: context?.browserUrl || ""
    };
  }

  function resolveAdapterPlanForTurn(task = "", context = {}, turnPlan = {}) {
    if (turnPlan?.surface === "background_browser") {
      return {
        kind: "browser",
        label: "Background browser",
        background: true,
        reason: turnPlan.reason || "planner selected public background browser",
        initialUrl: initialBackgroundBrowserUrlForTask?.(task) || ""
      };
    }
    if (turnPlan?.surface === "live_mac") {
      return {
        kind: "native",
        label: "Live Mac",
        background: false,
        reason: turnPlan.reason || "planner selected live Mac control",
        activeApp: context?.activeApp || "",
        activeWindowTitle: context?.activeWindowTitle || "",
        browserTitle: context?.browserTitle || "",
        browserUrl: context?.browserUrl || ""
      };
    }
    return resolveAdapterPlan(task, context);
  }

  return {
    taskTargetsOpenArgosApp,
    taskRequiresUserBrowserSession,
    taskTargetsNativeApp,
    taskTargetsBrowserSession,
    taskRequestsBackgroundBrowser,
    taskLooksLikePublicWebTask,
    resolveAdapterPlan,
    resolveAdapterPlanForTurn
  };
}

module.exports = {
  createComputerUseSurfaceRouter
};
