"use strict";

function createComputerUseSafetyGate({
  pendingApprovals,
  randomId,
  timeoutMs = 5 * 60 * 1000,
  truncateText,
  presentApproval,
  cancelledError,
  log
} = {}) {
  if (!pendingApprovals || typeof pendingApprovals.get !== "function") {
    throw new Error("Computer Use safety gate requires a pending approval map.");
  }
  if (typeof randomId !== "function") throw new Error("Computer Use safety gate requires randomId.");
  const shorten = typeof truncateText === "function"
    ? truncateText
    : (value, maxLength = 600) => String(value || "").slice(0, maxLength);
  const logger = typeof log === "function" ? log : () => {};

  function blockerFromError(error, context = {}) {
    const rawMessage = String(error?.message || "Computer Use could not finish that task.").trim();
    const code = String(error?.code || "").trim();
    const adapter = context.adapter || {};
    const messageText = `${rawMessage} ${code}`.toLowerCase();
    let category = "unknown";
    let message = rawMessage;

    if (/screen recording|screen capture|capture_failed|capture the screen/i.test(messageText)) {
      category = "screen_recording";
      message = "Computer Use could not read the screen. Reopen OpenArgos after granting Screen Recording, then retry the task.";
    } else if (/accessibility|trusted|input bridge/i.test(messageText)) {
      category = "accessibility";
      message = "Computer Use could not use macOS Accessibility control. Reopen OpenArgos after granting Accessibility, then retry the task.";
    } else if (/api key|model|computer use-capable|provider|openai computer use request|network|could not connect/i.test(messageText)) {
      category = "runtime";
    } else if (/not allow|denied|approval|safety check/i.test(messageText)) {
      category = "approval";
    } else if (/repeated|without visible progress|without verified progress|blindly|low-progress|address\/search field|model-turn budget|runaway/i.test(messageText)) {
      category = "no_progress";
      message = adapter.background
        ? "Computer Use stopped because the background browser was not showing verified progress after repeated actions."
        : "Computer Use stopped because the live Mac UI was not showing verified progress after repeated actions.";
    } else if (/sign-in|sign in|login|log in/i.test(messageText)) {
      category = "auth_required";
    } else if (/downloadable image|download_not_found/i.test(messageText)) {
      category = "not_found";
    } else if (/click the openargos|scroll the openargos|blind click|usable target|target/i.test(messageText)) {
      category = "targeting";
    }

    return {
      category,
      code: code || null,
      message,
      rawMessage,
      adapter: adapter.kind || "",
      background: Boolean(adapter.background),
      step: Number(context.step || 0) || null,
      lastStep: context.lastStep || null,
      task: shorten(context.approval?.task || "", 260)
    };
  }

  function resolveCriticalApproval({ decisionId, approvalId, decision }) {
    const pending = pendingApprovals.get(decisionId);
    if (!pending || String(pending.approvalId || "") !== String(approvalId || "")) {
      return false;
    }
    pendingApprovals.delete(decisionId);
    pending.cleanup?.();
    pending.resolve({
      decision,
      decidedAt: new Date().toISOString()
    });
    return true;
  }

  function waitForCriticalApproval({ sendStream, sendStatus, approval, runControl, risk, stepEntry }) {
    const decisionId = randomId("cua_critical");
    sendStatus?.("Needs approval");
    presentApproval?.();
    sendStream?.("computer_risk_approval", {
      decisionId,
      approvalId: approval.approvalId || "",
      sessionId: approval.sessionId || "",
      title: risk.title || "Approve action?",
      message: risk.message || "OpenArgos is about to perform an action that may be hard to undo.",
      category: risk.category || "critical",
      actionLabel: risk.actionLabel || stepEntry?.label || "Critical action",
      step: stepEntry?.step || null
    });

    return new Promise((resolve, reject) => {
      const signal = runControl?.abortController?.signal;
      const cleanup = () => {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener("abort", onAbort);
      };
      const timeout = setTimeout(() => {
        pendingApprovals.delete(decisionId);
        cleanup();
        const error = new Error("Computer Use stopped because the approval prompt timed out.");
        error.code = "computer_use_critical_approval_timeout";
        logger("computer_use_critical_approval_timeout", {
          approvalId: approval.approvalId || null,
          sessionId: approval.sessionId || null,
          decisionId,
          step: stepEntry?.step || null,
          category: risk.category || "critical"
        });
        reject(error);
      }, timeoutMs);
      const onAbort = () => {
        pendingApprovals.delete(decisionId);
        cleanup();
        reject(typeof cancelledError === "function" ? cancelledError() : new Error("Computer Use stopped."));
      };
      if (signal?.aborted || runControl?.cancelled) {
        onAbort();
        return;
      }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      pendingApprovals.set(decisionId, {
        approvalId: approval.approvalId || "",
        resolve,
        reject,
        cleanup
      });
    });
  }

  return {
    blockerFromError,
    resolveCriticalApproval,
    waitForCriticalApproval
  };
}

module.exports = {
  createComputerUseSafetyGate
};
