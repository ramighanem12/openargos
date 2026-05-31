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
  const maxTraceEvents = 100;

  function redactTraceText(value = "", maxLength = 260) {
    return shorten(String(value || "")
      .replace(/\b(?:sk|xai|sk-ant|sk-or)-[A-Za-z0-9._-]{12,}\b/g, "[redacted-key]")
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
      .replace(/\b(?:password|token|secret|api key|apikey)\s*[:=]\s*\S+/gi, "$1=[redacted]"), maxLength);
  }

  function cleanTraceEvent(event = {}) {
    const type = redactTraceText(event.type || "event", 80).replace(/[^a-z0-9_.:-]+/gi, "_");
    const at = event.at || new Date().toISOString();
    const cleaned = {
      type,
      at,
      step: Number(event.step || 0) || null,
      status: event.status ? redactTraceText(event.status, 80) : undefined,
      surface: event.surface ? redactTraceText(event.surface, 80) : undefined,
      actionType: event.actionType ? redactTraceText(event.actionType, 80) : undefined,
      label: event.label ? redactTraceText(event.label, 260) : undefined,
      target: event.target ? redactTraceText(event.target, 220) : undefined,
      url: event.url ? redactTraceText(event.url, 260) : undefined,
      blockerCategory: event.blockerCategory ? redactTraceText(event.blockerCategory, 80) : undefined,
      errorMessage: event.errorMessage ? redactTraceText(event.errorMessage, 320) : undefined,
      verified: typeof event.verified === "boolean" ? event.verified : undefined,
      retried: typeof event.retried === "boolean" ? event.retried : undefined,
      durationMs: Number.isFinite(Number(event.durationMs)) ? Number(event.durationMs) : undefined
    };
    return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value !== undefined && value !== ""));
  }

  function summarizeTraceEvents(events = []) {
    const list = Array.isArray(events) ? events : [];
    const counts = list.reduce((acc, event) => {
      const type = event?.type || "event";
      acc[type] = Number(acc[type] || 0) + 1;
      return acc;
    }, {});
    const lastEvent = list.at(-1) || null;
    const lastError = [...list].reverse().find((event) => event?.errorMessage || event?.blockerCategory) || null;
    return {
      eventCount: list.length,
      counts,
      lastEvent,
      lastError
    };
  }

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
        const sessionMetadata = session.metadata && typeof session.metadata === "object" ? session.metadata : null;
        const payloadMetadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null;
        result = {
          ...session,
          ...payload,
          _id: session._id,
          ...(payloadMetadata && sessionMetadata ? { metadata: { ...sessionMetadata, ...payloadMetadata } } : {}),
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
    const docs = (Array.isArray(payload) ? payload : [payload]).filter(Boolean).map((item) => ({
      _id: localDocId("cua_action"),
      createdAt: now,
      ...item
    }));
    if (!docs.length) return Array.isArray(payload) ? [] : null;
    updateLocalStore((store) => ({
      ...store,
      computerUseActions: [...docs, ...(Array.isArray(store.computerUseActions) ? store.computerUseActions : [])].slice(0, 1000)
    }));
    return Array.isArray(payload) ? docs : docs[0];
  }

  function appendTraceEvent(sessionId = "", event = {}) {
    const id = String(sessionId || "").trim();
    if (!id) return null;
    const traceEvents = (Array.isArray(event) ? event : [event]).filter(Boolean).map(cleanTraceEvent);
    if (!traceEvents.length) return null;
    let result = null;
    updateLocalStore((store) => {
      const sessions = (Array.isArray(store.computerUseSessions) ? store.computerUseSessions : []).map((session) => {
        if (session._id !== id && session.id !== id) return session;
        const metadata = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
        const trace = metadata.executionTrace && typeof metadata.executionTrace === "object"
          ? metadata.executionTrace
          : { version: 1, events: [] };
        const events = [...(Array.isArray(trace.events) ? trace.events : []), ...traceEvents].slice(-maxTraceEvents);
        const executionTrace = {
          version: 1,
          events,
          summary: summarizeTraceEvents(events)
        };
        result = {
          ...session,
          updatedAt: Date.now(),
          metadata: {
            ...metadata,
            executionTrace
          }
        };
        return result;
      });
      return { ...store, computerUseSessions: sessions };
    });
    return result;
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
    const traceSummary = metadata.executionTrace?.summary || null;
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
      traceSummary,
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
      taskState.traceSummary?.lastEvent?.type ? `Last trace event: ${taskState.traceSummary.lastEvent.type}` : "",
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
      taskState.traceSummary?.lastEvent?.type ? `Last trace event: ${taskState.traceSummary.lastEvent.type}` : "",
      taskState.lastKnownState?.label ? `Last step: ${taskState.lastKnownState.label} (${taskState.lastKnownState.status || "unknown"})` : ""
    ].filter(Boolean).join("\n");
  }

  return {
    createSession,
    updateSession,
    updateTaskState,
    recordAction,
    appendTraceEvent,
    latestForThread,
    compactText,
    promptText
  };
}

module.exports = {
  createComputerUseTaskStore
};
