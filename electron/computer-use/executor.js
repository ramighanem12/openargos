"use strict";

function createComputerUseExecutor({
  normalizeComputerIntentText,
  normalizeAmbientResponseText,
  extractOpenAIText,
  truncateText
} = {}) {
  const normalizeIntent = typeof normalizeComputerIntentText === "function"
    ? normalizeComputerIntentText
    : (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const normalizeResponse = typeof normalizeAmbientResponseText === "function"
    ? normalizeAmbientResponseText
    : (value) => String(value || "").trim();
  const extractText = typeof extractOpenAIText === "function"
    ? extractOpenAIText
    : () => "";
  const shorten = typeof truncateText === "function"
    ? truncateText
    : (value, maxLength = 600) => String(value || "").slice(0, maxLength);

  function extractComputerCalls(response) {
    return (response?.output || [])
      .filter((item) => item?.type === "computer_call")
      .map((item) => ({
        ...item,
        actions: Array.isArray(item.actions)
          ? item.actions
          : item.action
            ? [item.action]
            : []
      }));
  }

  function extractReasoningStatus(response) {
    const reasoning = (response?.output || []).find((item) => item?.type === "reasoning");
    const summaries = reasoning?.summary || reasoning?.summaries || [];
    const text = Array.isArray(summaries)
      ? summaries.map((item) => item?.text || item?.summary_text || "").filter(Boolean).join(" ")
      : "";
    return shorten(text, 120);
  }

  function approvalText() {
    return [
      "Okay, I’ll use Computer Use.",
      "",
      "Approve to continue. I’ll stop before anything risky or irreversible."
    ].join("\n");
  }

  function finalTextFromResponse(response) {
    return normalizeResponse(extractText(response));
  }

  function finalTextLooksLikeModeFailure(text = "") {
    const normalized = normalizeIntent(text);
    return /\b(?:normal chat|not in (?:the )?computer use runner|can'?t actually click|can'?t take control|turn on computer use|start computer use|approve computer use|give me the exact task|ask again|try again so i can operate)\b/.test(normalized);
  }

  function taskAllowsReadOnlyCompletion(task = "") {
    const text = normalizeIntent(task);
    return /\b(?:what'?s on my screen|what is on my screen|what do you see|can you see my screen|read (?:the )?screen|describe (?:the )?screen|visible on (?:the )?screen)\b/.test(text);
  }

  function shouldRetryNoOp({ finalText = "", meaningfulActionTotal = 0, task = "" } = {}) {
    const stoppedWithoutAction = meaningfulActionTotal === 0 && !taskAllowsReadOnlyCompletion(task);
    return {
      retry: finalTextLooksLikeModeFailure(finalText) || stoppedWithoutAction,
      stoppedWithoutAction
    };
  }

  return {
    extractComputerCalls,
    extractReasoningStatus,
    approvalText,
    finalTextFromResponse,
    finalTextLooksLikeModeFailure,
    taskAllowsReadOnlyCompletion,
    shouldRetryNoOp
  };
}

module.exports = {
  createComputerUseExecutor
};
