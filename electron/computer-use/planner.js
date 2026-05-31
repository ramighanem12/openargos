"use strict";

function defaultTruncate(value, maxLength = 6000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function createComputerUsePlanner({
  truncateText = defaultTruncate,
  normalizeComputerIntentText,
  detectAmbientMemorySaveIntent,
  detectComputerUseStatusQuery,
  detectComputerUseIntent,
  resolveComputerUseTask,
  rejectsComputerUseIntent,
  textLooksLikeComputerUseTask,
  textLooksLikeComputerUseFollowup,
  extractPublicImageDownloadSubject,
  resolveImageDownloadFollowupTask,
  hasRecentComputerUseContext,
  compactComputerUseTaskStateText
} = {}) {
  const normalizeIntent = typeof normalizeComputerIntentText === "function"
    ? normalizeComputerIntentText
    : (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const compactTaskState = typeof compactComputerUseTaskStateText === "function"
    ? compactComputerUseTaskStateText
    : () => "None";

  function formatRoutingMessage(message = {}) {
    const role = message.role === "assistant"
      ? "Assistant"
      : message.role === "user"
        ? "User"
        : message?.metadata?.kind === "user_action"
          ? "User action"
          : "System";
    const metadata = message.metadata || {};
    const tags = [
      metadata.actionFamily === "computer_use" ? "computer_use" : "",
      metadata.actionType || ""
    ].filter(Boolean).join(", ");
    const suffix = tags ? ` [${tags}]` : "";
    return `${role}${suffix}: ${truncateText(String(message.text || "").replace(/\s+/g, " ").trim(), 520)}`;
  }

  function shouldResolveFollowupWithModel(question, recentMessages = []) {
    const text = String(question || "").trim();
    if (!text || text.length > 500) return false;
    if (rejectsComputerUseIntent?.(text)) return false;
    if (textLooksLikeComputerUseTask?.(text)) return false;
    if (resolveImageDownloadFollowupTask?.(text, recentMessages)) return false;
    return Boolean(hasRecentComputerUseContext?.(recentMessages));
  }

  function buildFollowupRoutingPrompt({ question, recentMessages }) {
    const recent = (Array.isArray(recentMessages) ? recentMessages : [])
      .slice(-12)
      .map(formatRoutingMessage)
      .filter(Boolean)
      .join("\n");
    return [
      "You are a routing resolver for a desktop assistant.",
      "Decide whether the latest user message should continue a previous Computer Use task or should be answered as normal chat.",
      "",
      "Choose computer_use only when the latest user message is asking the assistant to operate the computer, browser, app, file system, media app, or continue a previous operation.",
      "If the latest message is ambiguous but clearly refers to a previous Computer Use operation, rewrite it as one standalone imperative task.",
      "If it is a normal question, complaint, clarification, thanks, or explanation with no requested operation, choose chat.",
      "Do not answer the user. Do not mention approvals. Return strict JSON only.",
      "",
      "Schema:",
      "{\"decision\":\"computer_use\"|\"chat\",\"task\":\"standalone task if computer_use, else empty string\",\"reason\":\"short reason\"}",
      "",
      `Recent conversation:\n${recent || "None"}`,
      "",
      `Latest user message:\n${truncateText(question, 800)}`
    ].join("\n");
  }

  function buildTurnPrompt({ question, recentMessages, taskState }) {
    const recent = (Array.isArray(recentMessages) ? recentMessages : [])
      .slice(-14)
      .map(formatRoutingMessage)
      .filter(Boolean)
      .join("\n");
    return [
      "You are the first-pass tool planner for OpenArgos, a local Mac assistant.",
      "Do not answer the user. Decide which route should handle the latest user turn.",
      "",
      "Routes:",
      "- chat: answer normally with the selected language model.",
      "- computer_use: operate a browser, website, app, file, media app, or the Mac UI.",
      "- memory: save an explicit durable user memory.",
      "- settings: answer local app status/settings questions.",
      "- clarify: ask one short clarification because the action target is genuinely missing.",
      "",
      "Computer Use rules:",
      "- If the latest user turn is a follow-up, pronoun, correction, or nudge that continues a recent Computer Use task, choose computer_use before chat.",
      "- Write task as one standalone imperative goal. Preserve filenames, services, and constraints from the user.",
      "- For referential follow-ups, continue the requested operation against recent conversation/task context instead of answering the reference in chat.",
      "- Do not route complaints, debugging questions, or product feedback to computer_use unless the user asks OpenArgos to operate the Mac/browser/app.",
      "- Do not tell the user to enable or approve Computer Use. The app will handle availability and approval.",
      "- Use surface background_browser for public web lookup/download/navigation that does not require the user's logged-in account or native app.",
      "- Use surface live_mac for signed-in services, personal accounts, current visible browser state, Finder/files, native apps, media apps, and OpenArgos settings.",
      "",
      "Return strict JSON only with this schema:",
      "{\"route\":\"chat|computer_use|memory|settings|clarify\",\"task\":\"standalone task for computer_use, memory text for memory, or empty\",\"goal\":\"short current goal/status label\",\"surface\":\"background_browser|live_mac|none\",\"continuation_task_id\":\"task id if continuing, else empty\",\"clarification\":\"short question if clarify, else empty\",\"reason\":\"short reason\"}",
      "",
      `Recent Computer Use task state:\n${compactTaskState(taskState)}`,
      "",
      `Recent conversation:\n${recent || "None"}`,
      "",
      `Latest user turn:\n${truncateText(question, 900)}`
    ].join("\n");
  }

  function normalizeTurnPlan(parsed = {}, { question = "", taskState = null } = {}) {
    const rawRoute = String(parsed?.route || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const routeAliases = {
      computer: "computer_use",
      computeruse: "computer_use",
      computer_use_task: "computer_use",
      setting: "settings",
      settings_status: "settings",
      memory_save: "memory",
      ask_clarification: "clarify"
    };
    const route = routeAliases[rawRoute] || rawRoute;
    const allowedRoutes = new Set(["chat", "computer_use", "memory", "settings", "clarify"]);
    const normalizedRoute = allowedRoutes.has(route) ? route : "chat";
    const rawSurface = String(parsed?.surface || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const surface = ["background_browser", "live_mac"].includes(rawSurface)
      ? rawSurface
      : "none";
    let task = String(parsed?.task || "").replace(/\s+/g, " ").trim();
    const goal = String(parsed?.goal || "").replace(/\s+/g, " ").trim();
    if (normalizedRoute === "computer_use" && !task) {
      task = goal || String(question || "").trim();
    }
    if (normalizedRoute === "memory" && !task) {
      task = String(parsed?.memory_text || parsed?.memoryText || "").replace(/\s+/g, " ").trim();
    }
    const continuationTaskId = String(parsed?.continuation_task_id || parsed?.continuationTaskId || "").trim();
    return {
      route: normalizedRoute,
      task,
      goal,
      surface,
      continuationTaskId,
      clarification: String(parsed?.clarification || "").replace(/\s+/g, " ").trim(),
      reason: String(parsed?.reason || "").replace(/\s+/g, " ").trim(),
      continued: Boolean(continuationTaskId || (normalizedRoute === "computer_use" && taskState?.taskId && /follow|continu|refer|previous|recent|pronoun|nudge/i.test(String(parsed?.reason || ""))))
    };
  }

  function fallbackTurnPlan(question, recentMessages = [], taskState = null) {
    const memorySaveIntent = detectAmbientMemorySaveIntent?.(question);
    if (memorySaveIntent) {
      return {
        route: "memory",
        task: memorySaveIntent.text || "",
        goal: "Save memory",
        surface: "none",
        continuationTaskId: "",
        clarification: "",
        reason: "local fallback memory intent"
      };
    }
    if (detectComputerUseStatusQuery?.(question)) {
      return {
        route: "settings",
        task: "",
        goal: "Check Computer Use status",
        surface: "none",
        continuationTaskId: "",
        clarification: "",
        reason: "local fallback settings status"
      };
    }
    if (looksLikeProductFeedbackQuestion(question, taskState)) {
      return {
        route: "chat",
        task: "",
        goal: "",
        surface: "none",
        continuationTaskId: "",
        clarification: "",
        reason: "local fallback product feedback"
      };
    }
    const followupLike = Boolean(textLooksLikeComputerUseFollowup?.(question));
    const directComputerTask = !followupLike && Boolean(textLooksLikeComputerUseTask?.(question) || extractPublicImageDownloadSubject?.(question));
    if (!directComputerTask && looksLikeContinuationPhrase(question, taskState)) {
      const surface = taskState?.adapter
        ? taskState.background
          ? "background_browser"
          : "live_mac"
        : "none";
      const task = buildContinuationTask(question);
      return {
        route: "computer_use",
        task,
        goal: "Continue Computer Use task",
        surface,
        continuationTaskId: taskState?.taskId || "",
        clarification: "",
        reason: "local fallback computer use continuation",
        continued: true
      };
    }
    if (detectComputerUseIntent?.(question, { recentMessages, taskState })) {
      const task = resolveComputerUseTask?.(question, recentMessages, { taskState }) || String(question || "").trim();
      return {
        route: "computer_use",
        task,
        goal: task,
        surface: "none",
        continuationTaskId: taskState?.taskId || "",
        clarification: "",
        reason: "local fallback computer use intent",
        continued: Boolean(taskState?.taskId && looksLikeContinuationPhrase(question, taskState))
      };
    }
    return {
      route: "chat",
      task: "",
      goal: "",
      surface: "none",
      continuationTaskId: "",
      clarification: "",
      reason: "local fallback chat"
    };
  }

  function looksLikeProductFeedbackQuestion(question = "", taskState = null) {
    const normalized = normalizeIntent(question);
    if (!normalized) return false;
    const hasActiveTask = Boolean(taskState?.task || taskState?.goal);
    const continuationNudge = hasActiveTask &&
      /\b(?:i asked you to|i told you to|are you not|why are you not|why aren't you|you still haven'?t|you gonna|going to do it|do it|do that)\b/.test(normalized) &&
      /\b(?:download|save|open|go to|click|type|scroll|delete|play|order|reorder|send|do it|do that)\b/.test(normalized);
    if (continuationNudge) return false;
    if (!/^(?:why|how|what|where|when|who|is|are|do|does|did|can|could|should|would|will)\b/.test(normalized)) return false;
    if (!/\b(?:you|it|that|this|app|openargos|argos|computer\s+use|browser|screen|model|route|planning|planner|harness)\b/.test(normalized)) return false;
    if (/^(?:can|could|would|will|please)\b.*\b(?:go to|open|download|save|click|type|scroll|delete|play|order|reorder|send|use my computer|take control)\b/.test(normalized)) return false;
    return /\b(?:why|how|what|where|when|wrong|broken|issue|problem|bug|slow|fast|freeze|frozen|stuck|route|routed|planning|planner|hard[-\s]?cod|did|does)\b/.test(normalized);
  }

  function looksLikeContinuationPhrase(question = "", taskState = null) {
    if (!taskState?.task && !taskState?.goal) return false;
    const normalized = normalizeIntent(question);
    if (!normalized || normalized.length > 180 || rejectsComputerUseIntent?.(normalized)) return false;
    if (/^(?:hi|hello|hey|thanks|thank you|cool|nice|ok|okay)\b/.test(normalized)) return false;
    const asksAboutBehavior = /^(?:why|how|what|where|when)\b/.test(normalized) &&
      /\b(?:you|it|that|this|app|openargos|argos|computer\s+use|browser|screen|model|route|planning)\b/.test(normalized);
    if (asksAboutBehavior && !textLooksLikeComputerUseTask?.(normalized)) return false;
    if (textLooksLikeComputerUseFollowup?.(normalized)) return true;
    if (/\b(?:it|that|this|same|another|again|redo|retry|now|next|his|her|their|song|track|one)\b/.test(normalized)) {
      return true;
    }
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const startsAsQuestion = /^(?:why|how|what|where|when|who|is|are|do|does|did|can|could|should|would|will)\b/.test(normalized);
    return wordCount > 0 && wordCount <= 10 && !startsAsQuestion;
  }

  function shouldUseModelTurnPlanner(question, recentMessages = [], taskState = null, localPlan = null) {
    if (!question || rejectsComputerUseIntent?.(question)) return false;
    if (localPlan?.route === "memory" || localPlan?.route === "settings") return false;
    if (localPlan?.route === "computer_use" && localPlan.continued) return false;
    if (!taskState?.taskId && !hasRecentComputerUseContext?.(recentMessages)) return false;
    if (localPlan?.route === "chat") {
      return looksLikeContinuationPhrase(question, taskState);
    }
    if (localPlan?.route === "computer_use") {
      const directTask = textLooksLikeComputerUseTask?.(question) || extractPublicImageDownloadSubject?.(question);
      return !directTask && looksLikeContinuationPhrase(question, taskState);
    }
    return false;
  }

  function buildContinuationTask(question = "") {
    const latest = truncateText(String(question || "").replace(/\s+/g, " ").trim(), 260);
    return latest
      ? `Continue Computer Use with this latest user request: ${latest}`
      : "Continue Computer Use.";
  }

  return {
    formatRoutingMessage,
    shouldResolveFollowupWithModel,
    buildFollowupRoutingPrompt,
    buildTurnPrompt,
    normalizeTurnPlan,
    fallbackTurnPlan,
    buildContinuationTask,
    looksLikeContinuationPhrase,
    shouldUseModelTurnPlanner
  };
}

module.exports = {
  createComputerUsePlanner
};
