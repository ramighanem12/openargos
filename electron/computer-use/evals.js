"use strict";

function createComputerUseEvalSuite({
  planner,
  executor,
  actionVerifier,
  surfaceRouter,
  safetyGate,
  detectCriticalAction,
  blockedBackgroundBrowserActionReason
} = {}) {
  const tests = [];

  function add(name, run) {
    tests.push({ name, run });
  }

  add("planner routes direct image download to computer_use", () => {
    const plan = planner.fallbackTurnPlan("Download a photo of Grace Hopper and name the file grace-hopper.", [], null);
    if (plan.route !== "computer_use") throw new Error(`Expected computer_use, got ${plan.route}`);
    if (!/grace hopper/i.test(plan.task)) throw new Error(`Expected task to preserve subject, got ${plan.task}`);
  });

  add("planner keeps product complaints in chat", () => {
    const plan = planner.fallbackTurnPlan("Why did computer use click the wrong thing?", [], {
      taskId: "cua_1",
      task: "Download a photo of Barack Obama",
      goal: "Download a photo of Barack Obama"
    });
    if (plan.route !== "chat") throw new Error(`Expected chat, got ${plan.route}`);
  });

  add("planner routes short continuation with task state", () => {
    const taskState = {
      taskId: "cua_1",
      task: "Download a photo of Ada Lovelace",
      goal: "Download a photo of Ada Lovelace"
    };
    const plan = planner.fallbackTurnPlan("now another photo", [], taskState);
    if (plan.route !== "computer_use") throw new Error(`Expected computer_use continuation, got ${plan.route}`);
    if (!plan.continuationTaskId) throw new Error("Expected continuation task id.");
  });

  add("planner routes frustrated continuation nudges with task state", () => {
    const taskState = {
      taskId: "cua_2",
      task: "Download a photo of Melania Trump",
      goal: "Download a photo of Melania Trump"
    };
    const plan = planner.fallbackTurnPlan("Are you not downloading it? I asked you to download it.", [], taskState);
    if (plan.route !== "computer_use") throw new Error(`Expected computer_use, got ${plan.route}`);
    if (!/melania trump/i.test(plan.task)) throw new Error(`Expected task state to stay authoritative, got ${plan.task}`);
  });

  add("surface router sends public image tasks to background browser", () => {
    const plan = surfaceRouter.resolveAdapterPlan("Download a photo of Sam Altman.");
    if (plan.kind !== "browser" || !plan.background) throw new Error(`Expected background browser, got ${plan.kind}`);
  });

  add("surface router sends signed-in account tasks to live Mac", () => {
    const plan = surfaceRouter.resolveAdapterPlan("Go to DoorDash and tell me my last three orders.");
    if (plan.kind !== "native" || plan.background) throw new Error(`Expected live Mac, got ${plan.kind}`);
  });

  add("executor retries chat-mode no-op failures", () => {
    if (!executor?.shouldRetryNoOp) return;
    const decision = executor.shouldRetryNoOp({
      finalText: "I can't take control from normal chat. Turn on Computer Use.",
      meaningfulActionTotal: 0,
      task: "Download a photo of Sam Altman"
    });
    if (!decision.retry || !decision.stoppedWithoutAction) throw new Error("Expected no-op retry decision.");
  });

  add("action verifier batches address-bar navigation safely", () => {
    if (!actionVerifier?.safeActionBatch) return;
    const actions = [
      { type: "keypress", keys: ["COMMAND", "L"] },
      { type: "type", text: "https://example.com" },
      { type: "keypress", keys: ["ENTER"] },
      { type: "click", x: 10, y: 10 }
    ];
    const batch = actionVerifier.safeActionBatch(actions);
    if (batch.length !== 3) throw new Error(`Expected 3-action navigation batch, got ${batch.length}`);
  });

  add("action verifier does not batch unrelated clicks", () => {
    if (!actionVerifier?.safeActionBatch) return;
    const batch = actionVerifier.safeActionBatch([
      { type: "click", x: 10, y: 10 },
      { type: "click", x: 30, y: 30 }
    ]);
    if (batch.length !== 1) throw new Error(`Expected one click, got ${batch.length}`);
  });

  add("safety gate identifies delete approval", () => {
    if (typeof detectCriticalAction !== "function") return;
    const risk = detectCriticalAction({
      task: "Delete the file on my Desktop",
      action: { type: "click" },
      target: { label: "Delete", role: "button" },
      frontmost: { activeApp: "Finder" }
    });
    if (risk?.category !== "delete") throw new Error(`Expected delete risk, got ${risk?.category || "none"}`);
  });

  add("background public task blocks sign-in clicks", () => {
    if (typeof blockedBackgroundBrowserActionReason !== "function") return;
    const reason = blockedBackgroundBrowserActionReason({
      task: "Download a photo of Barack Obama",
      action: { type: "click" },
      target: { label: "Sign in", role: "button", href: "https://accounts.google.com/" }
    });
    if (!reason) throw new Error("Expected sign-in control to be blocked for public background task.");
  });

  add("safety blocker classifies no-progress errors", () => {
    const blocker = safetyGate.blockerFromError(
      new Error("Computer Use repeated the same action without visible progress."),
      { adapter: { kind: "browser", background: true }, approval: { task: "Open Wikipedia" } }
    );
    if (blocker.category !== "no_progress") throw new Error(`Expected no_progress, got ${blocker.category}`);
  });

  async function run() {
    const results = [];
    for (const test of tests) {
      try {
        await test.run();
        results.push({ name: test.name, ok: true });
      } catch (error) {
        results.push({
          name: test.name,
          ok: false,
          message: error?.message || String(error)
        });
      }
    }
    return {
      ok: results.every((result) => result.ok),
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok),
      results
    };
  }

  return {
    tests,
    run
  };
}

module.exports = {
  createComputerUseEvalSuite
};
