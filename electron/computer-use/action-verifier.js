"use strict";

function createComputerUseActionVerifier({
  normalizeComputerActionType,
  normalizedComputerActionKeys,
  getAdapterStateFingerprint,
  runAdapterInterceptors,
  computerActionLogDetails,
  sleepForComputerUse,
  randomIntBetween,
  cancelledError,
  assertNotCancelled,
  log,
  microDelayMinMs = 5,
  microDelayMaxMs = 15,
  verifyWaitMs = 85,
  localRetryLimit = 1,
  fastMode = true
} = {}) {
  if (typeof normalizeComputerActionType !== "function") throw new Error("Action verifier requires normalizeComputerActionType.");
  const logger = typeof log === "function" ? log : () => {};
  const sleep = typeof sleepForComputerUse === "function"
    ? sleepForComputerUse
    : (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rand = typeof randomIntBetween === "function"
    ? randomIntBetween
    : (min, max) => Math.round((Number(min) + Number(max)) / 2);
  const assertActive = typeof assertNotCancelled === "function" ? assertNotCancelled : () => {};
  const actionLog = typeof computerActionLogDetails === "function" ? computerActionLogDetails : () => ({});

  function isMeaningfulAction(action) {
    return !["wait", "screenshot", "move"].includes(normalizeComputerActionType(action));
  }

  function actionCanSafelyLocalRetry(action, adapter = {}) {
    const type = normalizeComputerActionType(action);
    if (!isMeaningfulAction(action)) return false;
    if (adapter.verificationStrength !== "strong") return false;
    if (type === "type") return false;
    if (type === "keypress") {
      const keys = typeof normalizedComputerActionKeys === "function"
        ? normalizedComputerActionKeys(action)
        : [];
      if (keys.includes("DELETE") || keys.includes("BACKSPACE")) return false;
      if (keys.includes("RETURN") || keys.includes("ENTER")) return false;
    }
    return ["click", "double_click", "scroll"].includes(type);
  }

  async function executeQueuedAction({
    adapter,
    action,
    capture,
    context = {},
    runControl = null,
    actionLogDetails = null
  }) {
    assertActive(runControl);
    const meaningful = isMeaningfulAction(action);
    const canVerify = meaningful && typeof adapter?.stateFingerprint === "function";
    const beforeFingerprint = canVerify && typeof getAdapterStateFingerprint === "function"
      ? await getAdapterStateFingerprint(adapter, capture)
      : "";
    const executeOnce = async (attempt) => {
      assertActive(runControl);
      await sleep(rand(microDelayMinMs, microDelayMaxMs), runControl);
      await adapter.execute(action, capture, context);
      await sleep(verifyWaitMs, runControl);
      const handled = typeof runAdapterInterceptors === "function"
        ? await runAdapterInterceptors(adapter, capture, {
            ...context,
            phase: "post_action",
            action,
            attempt
          })
        : [];
      if (handled.length) {
        logger("computer_use_interceptor_handled", {
          adapter: adapter?.kind || "unknown",
          phase: "post_action",
          handled
        });
      }
    };

    await executeOnce(1);
    if (!canVerify || !beforeFingerprint || typeof getAdapterStateFingerprint !== "function") {
      return { verified: false, retried: false, beforeFingerprint, afterFingerprint: "" };
    }
    if (typeof adapter?.isBusy === "function" && await adapter.isBusy().catch(() => false)) {
      return { verified: false, retried: false, beforeFingerprint, afterFingerprint: "" };
    }

    let afterFingerprint = await getAdapterStateFingerprint(adapter, capture);
    const changed = Boolean(afterFingerprint && afterFingerprint !== beforeFingerprint);
    if (changed || !actionCanSafelyLocalRetry(action, adapter)) {
      return { verified: changed, retried: false, beforeFingerprint, afterFingerprint };
    }

    for (let retry = 1; retry <= localRetryLimit; retry += 1) {
      logger("computer_use_local_micro_retry", {
        adapter: adapter?.kind || "unknown",
        action: actionLogDetails || actionLog(action, capture),
        retry
      });
      await executeOnce(retry + 1);
      afterFingerprint = await getAdapterStateFingerprint(adapter, capture);
      if (afterFingerprint && afterFingerprint !== beforeFingerprint) {
        return { verified: true, retried: true, beforeFingerprint, afterFingerprint };
      }
    }
    return { verified: false, retried: true, beforeFingerprint, afterFingerprint };
  }

  function createActionQueue({ adapter, runControl = null } = {}) {
    let tail = Promise.resolve();
    let cleared = false;
    return {
      clear() {
        cleared = true;
      },
      async run(payload) {
        const run = async () => {
          if (cleared) {
            throw typeof cancelledError === "function" ? cancelledError() : new Error("Computer Use stopped.");
          }
          return await executeQueuedAction({
            adapter,
            runControl,
            ...payload
          });
        };
        tail = tail.then(run, run);
        return await tail;
      }
    };
  }

  function isComputerKeypressAction(action, matcher) {
    if (normalizeComputerActionType(action) !== "keypress") return false;
    const keys = typeof normalizedComputerActionKeys === "function"
      ? normalizedComputerActionKeys(action)
      : [];
    return matcher(keys);
  }

  function safeActionBatch(actions = []) {
    const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
    if (!fastMode || list.length <= 1) return list;
    const meaningful = list.filter((action) => !["screenshot", "move"].includes(normalizeComputerActionType(action)));
    if (meaningful.length <= 1) return list.slice(0, 1);

    const firstType = normalizeComputerActionType(meaningful[0]);
    const types = meaningful.map(normalizeComputerActionType);
    const allKeyboardOrText = types.every((type) => type === "keypress" || type === "type");
    if (allKeyboardOrText) return meaningful.slice(0, 4);

    const addressBarSequence = meaningful.length >= 3 &&
      isComputerKeypressAction(meaningful[0], (keys) => keys.includes("COMMAND") && keys.includes("L")) &&
      normalizeComputerActionType(meaningful[1]) === "type" &&
      isComputerKeypressAction(meaningful[2], (keys) => keys.includes("ENTER") || keys.includes("RETURN"));
    if (addressBarSequence) return meaningful.slice(0, 3);

    if (firstType === "click" || firstType === "double_click") {
      const secondType = normalizeComputerActionType(meaningful[1]);
      if (secondType === "type") return meaningful.slice(0, 2);
      return meaningful.slice(0, 1);
    }
    if (firstType === "scroll") return meaningful.slice(0, 1);
    return meaningful.slice(0, 1);
  }

  return {
    isMeaningfulAction,
    actionCanSafelyLocalRetry,
    executeQueuedAction,
    createActionQueue,
    safeActionBatch
  };
}

module.exports = {
  createComputerUseActionVerifier
};
