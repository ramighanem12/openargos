"use strict";

function createComputerUseTaskStore({
  readLocalStore,
  updateLocalStore,
  localDocId,
  truncateText
} = {}) {
  if (typeof readLocalStore !== "function") throw new Error("Computer Use task store requires readLocalStore.");
  if (typeof updateLocalStore !== "function") throw new Error("Computer Use task store requires updateLocalStore.");
  if (typeof localDocId !== "function") throw new Error("Computer Use task store requires localDocId.");
  const shorten = typeof truncateText === "function"
    ? truncateText
    : (value, maxLength = 600) => String(value || "").slice(0, maxLength);

  function createSession(session = {}) {
    const now = Date.now();
    const doc = {
      _id: localDocId("cua"),
      createdAt: now,
      updatedAt: now,
      status: "pending_approval",
      ...session
    };
    updateLocalStore((store) => ({
      ...store,
      computerUseSessions: [doc, ...(Array.isArray(store.computerUseSessions) ? store.computerUseSessions : [])].slice(0, 300)
    }));
    return doc;
  }

  function updateSession(payload = {}) {
    const sessionId = payload.sessionId || payload._id;
    if (!sessionId) return null;
    let result = null;
    updateLocalStore((store) => {
      const sessions = (Array.isArray(store.computerUseSessions) ? store.computerUseSessions : []).map((session) => {
        if (session._id !== sessionId) return session;
        result = {
          ...session,
          ...payload,
          _id: session._id,
          updatedAt: Date.now()
        };
        delete result.sessionId;
        return result;
      });
      return { ...store, computerUseSessions: sessions };
    });
    return result;
  }

  function updateTaskState(approval = {}, stepEntry = {}, status = "running") {
    if (!approval?.sessionId) return null;
    return updateSession({
      sessionId: approval.sessionId,
      status,
      lastKnownState: {
        step: stepEntry.step || null,
        label: stepEntry.label || "",
        status: stepEntry.status || status,
        app: stepEntry.app || "",
        windowTitle: stepEntry.windowTitle || "",
        surface: stepEntry.surface || "",
        url: stepEntry.url || "",
        updatedAt: new Date().toISOString()
      }
    });
  }

  function recordAction(payload = {}) {
    const now = Date.now();
    const doc = {
      _id: localDocId("cua_action"),
      createdAt: now,
      ...payload
    };
    updateLocalStore((store) => ({
      ...store,
      computerUseActions: [doc, ...(Array.isArray(store.computerUseActions) ? store.computerUseActions : [])].slice(0, 1000)
    }));
    return doc;
  }

  function latestForThread(threadId = "") {
    const id = String(threadId || "").trim();
    if (!id) return null;
    const store = readLocalStore();
    const sessions = Array.isArray(store.computerUseSessions) ? store.computerUseSessions : [];
    const matching = sessions
      .filter((session) => String(session?.ambientThreadId || session?.threadId || "") === id)
      .sort((a, b) => Number(b?.updatedAt || b?.createdAt || 0) - Number(a?.updatedAt || a?.createdAt || 0));
    const session = matching.find((candidate) => String(candidate?.task || candidate?.goal || "").trim()) || null;
    if (!session) return null;
    const metadata = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
    const blocker = session.blocker || metadata.blocker || null;
    const stepLog = Array.isArray(metadata.stepLog) ? metadata.stepLog : [];
    const lastStep = session.lastKnownState && typeof session.lastKnownState === "object"
      ? session.lastKnownState
      : stepLog.length
        ? stepLog.at(-1)
        : null;
    return {
      taskId: session._id || session.id || null,
      status: String(session.status || "unknown"),
      goal: String(session.goal || session.task || "").trim(),
      task: String(session.task || session.goal || "").trim(),
      adapter: session.adapter || metadata.adapter || "",
      background: Boolean(session.background || metadata.background),
      finalText: shorten(session.finalText || "", 600),
      errorMessage: shorten(session.errorMessage || blocker?.message || "", 600),
      blocker,
      lastKnownState: {
        step: Number(lastStep?.step || metadata.steps || 0) || null,
        label: lastStep?.label || "",
        status: lastStep?.status || "",
        app: lastStep?.app || metadata.activeApp || "",
        windowTitle: lastStep?.windowTitle || metadata.activeWindowTitle || "",
        url: lastStep?.url || metadata.browserUrl || ""
      }
    };
  }

  function compactText(taskState = null) {
    if (!taskState?.task && !taskState?.goal) return "None";
    const lines = [
      `Task id: ${taskState.taskId || "unknown"}`,
      `Status: ${taskState.status || "unknown"}`,
      `Goal: ${taskState.goal || taskState.task}`,
      taskState.adapter ? `Surface: ${taskState.background ? "background_browser" : "live_mac"} (${taskState.adapter})` : "",
      taskState.finalText ? `Last result: ${taskState.finalText}` : "",
      taskState.errorMessage ? `Last blocker: ${taskState.errorMessage}` : "",
      taskState.blocker?.category ? `Blocker category: ${taskState.blocker.category}` : "",
      taskState.lastKnownState?.label ? `Last step: ${taskState.lastKnownState.label} (${taskState.lastKnownState.status || "unknown"})` : ""
    ].filter(Boolean);
    return lines.join("\n");
  }

  function promptText(taskState = null) {
    if (!taskState?.task && !taskState?.goal) return "Current Computer Use task state: none";
    return [
      "Current Computer Use task state:",
      `Task id: ${taskState.taskId || "unknown"}`,
      `Status: ${taskState.status || "unknown"}`,
      `Goal: ${taskState.goal || taskState.task}`,
      taskState.finalText ? `Last result: ${taskState.finalText}` : "",
      taskState.errorMessage ? `Last blocker: ${taskState.errorMessage}` : "",
      taskState.blocker?.category ? `Blocker category: ${taskState.blocker.category}` : "",
      taskState.lastKnownState?.label ? `Last step: ${taskState.lastKnownState.label} (${taskState.lastKnownState.status || "unknown"})` : ""
    ].filter(Boolean).join("\n");
  }

  return {
    createSession,
    updateSession,
    updateTaskState,
    recordAction,
    latestForThread,
    compactText,
    promptText
  };
}

module.exports = {
  createComputerUseTaskStore
};
