"use strict";

function createComputerUseSessionRunner(deps = {}) {
  const {
    getComputerUseRuntimePolicy,
    computerUseUnavailableMessage,
    runtimeModelForModel,
    defaultComputerUseModelId,
    createComputerUseAdapter,
    computerUseSystemInstructions,
    isComputerUseEnabled,
    screenRecordingReadyForComputerUse,
    getAccessibilityStatus,
    getMacOSPermissions,
    localUpdateComputerUseSession,
    logModelUsageEvent,
    createComputerUseActionQueue,
    computerUseAmbientPassthrough,
    setAmbientComputerPassthrough,
    updateComputerUseOverlayStatus,
    showComputerUseOverlay,
    runAdapterInterceptors,
    writeAmbientLog,
    maybeRunComputerUseFastPath,
    assertComputerUseNotCancelled,
    computerObservationFingerprint,
    callOpenAIComputerResponse,
    safetyIdentifierForSession,
    modelCatalogInstructionText,
    computerUseRecentConversationText,
    computerUseTaskStateText,
    computerUseMemoryContextText,
    computerCaptureContextText,
    computerUseDetailForPayload,
    computerUseMaxSteps,
    extractComputerReasoningStatus,
    extractComputerCalls,
    computerUseExecutor,
    truncateText,
    normalizeComputerActionType,
    safeComputerActionBatch,
    computerUseMaxActions,
    computerUseNoProgressActionLimit,
    summarizeComputerAction,
    computerActionLogDetails,
    mapBackgroundBrowserPoint,
    blockedBackgroundBrowserActionReason,
    detectComputerUseCriticalAction,
    computerActionFingerprint,
    computerUseRepeatedActionLimit,
    updateComputerUseUserActionSteps,
    localUpdateComputerUseTaskState,
    localRecordComputerUseAction,
    computerUseCancelledError,
    waitForComputerUseCriticalApproval,
    computerActionStatus,
    sleepForComputerUse,
    computerUsePostActionWaitMs,
    computerUseBatchSettleWaitMs,
    extractPublicImageDownloadSubject,
    compactBackgroundSnapshotUrl,
    normalizeAmbientResponseText,
    extractOpenAIText,
    localAddAmbientMessage,
    normalizeAmbientMessageDoc,
    notifyMainWindow,
    computerUseBlockerFromError,
    diagnosticErrorDetails,
    hideComputerUseOverlay,
    setAmbientWindowDefaultLevel
  } = deps;

  async function runComputerUseSession({ event, approval, runControl = null }) {
  const sendStream = (type, data = {}) => {
    try {
      event.sender.send("ambient:ask-stream", { requestId: approval.streamRequestId, type, ...data });
    } catch {
      // The final invoke response still carries the authoritative result.
    }
  };
  const sendStatus = (text) => {
    if (!text) return;
    sendStream("status", { text });
    updateComputerUseOverlayStatus(text);
  };

  const computerUsePolicy = getComputerUseRuntimePolicy();
  const unavailableMessage = computerUseUnavailableMessage(computerUsePolicy);
  if (unavailableMessage) throw new Error(unavailableMessage);
  const apiKey = computerUsePolicy.credential.apiKey;
  const computerUseProvider = computerUsePolicy.provider || "openai";
  const computerUseRuntimeModel = computerUsePolicy.runtimeModel || runtimeModelForModel(defaultComputerUseModelId);
  const computerUseCredentialSource = computerUsePolicy.credential.credentialSource || "local_key";
  const adapter = await createComputerUseAdapter(approval.task, approval.adapterPlan || approval.context || {});
  const computerUseInstructions = computerUseSystemInstructions(adapter);
  if (!isComputerUseEnabled()) throw new Error("Computer Use is off. Turn it on in Settings > General.");
  if (adapter.requiresScreenRecording && !screenRecordingReadyForComputerUse()) {
    throw new Error("Computer Use needs Screen Recording enabled for OpenArgos first.");
  }
  if (adapter.requiresAccessibility && getAccessibilityStatus() !== "granted" && !getMacOSPermissions()?.isAccessibilityTrusted?.()) {
    throw new Error("Computer Use needs Accessibility enabled for OpenArgos first.");
  }

  localUpdateComputerUseSession({
    sessionId: approval.sessionId,
    status: "running",
    adapter: adapter.kind,
    background: Boolean(adapter.background)
  });
  void logModelUsageEvent({
    provider: computerUseProvider,
    model: computerUseRuntimeModel,
    credentialSource: computerUseCredentialSource,
    feature: "computer_use",
    operation: "computer_use_run",
    status: "started",
    requestId: approval.requestId,
    metadata: {
      adapter: adapter.kind,
      background: Boolean(adapter.background)
    }
  });

  const startedAt = Date.now();
  let finalText = "";
  let response = null;
  let step = 0;
  const computerUseSteps = [];
  let lastActionFingerprint = "";
  let repeatedActionCount = 0;
  let consecutiveNoProgressActions = 0;
  let browserNavigationAttempt = null;
  let browserNavigationStallCount = 0;
  let meaningfulActionTotal = 0;
  let noOpRetryUsed = false;
  const actionQueue = createComputerUseActionQueue({ adapter, runControl });
  setAmbientComputerPassthrough(computerUseAmbientPassthrough);
  showComputerUseOverlay({ approval, adapter, status: "Starting" });

  try {
    await adapter.prepare();
    const initialIntercepts = await runAdapterInterceptors(adapter, null, {
      phase: "initial",
      task: approval.task
    });
    if (initialIntercepts.length) {
      writeAmbientLog("computer_use_interceptor_handled", {
        adapter: adapter.kind,
        phase: "initial",
        handled: initialIntercepts
      });
    }
    writeAmbientLog("computer_use_adapter_selected", {
      requestId: approval.requestId,
      approvalId: approval.approvalId,
      sessionId: approval.sessionId || null,
      adapter: adapter.kind,
      background: Boolean(adapter.background),
      initialUrl: adapter.initialUrl || null
    });
    const fastPath = await maybeRunComputerUseFastPath({
      approval,
      adapter,
      sendStream,
      sendStatus,
      computerUseSteps
    });
    if (fastPath?.completed) {
      finalText = fastPath.finalText || "Done. I finished that task.";
      step = computerUseSteps.length;
    }

    if (!finalText) {
      assertComputerUseNotCancelled(runControl);
      sendStatus(adapter.background ? "Preparing background browser" : "Reading screen");
      const initialFocusContext = await adapter.getFocusContext().catch(() => null);
      const initialCapture = await adapter.capture({ focusContext: initialFocusContext });
      let currentObservationCapture = initialCapture;
      let lastObservationFingerprint = computerObservationFingerprint(initialCapture);
      assertComputerUseNotCancelled(runControl);
      response = await callOpenAIComputerResponse({
      apiKey,
      model: computerUseRuntimeModel,
      instructions: computerUseInstructions,
      safetyIdentifier: safetyIdentifierForSession(),
      signal: runControl?.abortController?.signal,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Task: ${approval.task}`,
                "",
                `OpenArgos model catalog, if this task involves model settings: ${modelCatalogInstructionText()}. The local build uses local provider keys only.`,
                "",
                computerUseRecentConversationText(approval.recentMessages),
                "",
                computerUseTaskStateText(approval.taskState),
                "",
                computerUseMemoryContextText(approval.memories),
                "",
                computerCaptureContextText(initialCapture),
                "",
                adapter.background
                  ? "Use the computer tool for UI interaction in the background browser. You already have the exact task; do not ask the user to repeat it. Inspect the screenshot, operate the browser UI, and verify the result before finishing."
                  : "Use the computer tool for UI interaction. You already have the exact task; do not ask the user to repeat it. Inspect the screenshot, operate the Mac UI, and verify the result before finishing."
              ].join("\n")
            },
            {
              type: "input_image",
              image_url: initialCapture.dataUrl,
              detail: computerUseDetailForPayload()
            }
          ]
        }
      ]
      });

      for (let loop = 0; loop < computerUseMaxSteps; loop += 1) {
      assertComputerUseNotCancelled(runControl);
      const reasoningStatus = extractComputerReasoningStatus(response);
      if (reasoningStatus) sendStatus(reasoningStatus);
      const calls = extractComputerCalls(response);
      if (!calls.length) {
        const proposedFinalText = computerUseExecutor.finalTextFromResponse(response);
        const noOpDecision = computerUseExecutor.shouldRetryNoOp({
          finalText: proposedFinalText,
          meaningfulActionTotal,
          task: approval.task
        });
        if (noOpDecision.retry) {
          if (!noOpRetryUsed) {
            noOpRetryUsed = true;
            writeAmbientLog("computer_use_noop_retry", {
              requestId: approval.requestId,
              approvalId: approval.approvalId,
              sessionId: approval.sessionId || null,
              stoppedWithoutAction: noOpDecision.stoppedWithoutAction,
              finalText: truncateText(proposedFinalText, 240)
            });
            response = await callOpenAIComputerResponse({
              apiKey,
              model: computerUseRuntimeModel,
              instructions: computerUseInstructions,
              safetyIdentifier: safetyIdentifierForSession(),
              signal: runControl?.abortController?.signal,
              previousResponseId: response.id,
              input: [
                {
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: [
                        `You did not operate the computer for this task: ${approval.task}`,
                        "You are already in the approved Computer Use runner. Do not ask the user to repeat the task or enable Computer Use.",
                        "Use the computer tool now. If the task cannot be completed, state the concrete blocker after trying the relevant UI action."
                      ].join("\n")
                    }
                  ]
                }
              ]
            });
            continue;
          }
          throw new Error("Computer Use stopped without taking a meaningful action for the requested task.");
        }
        finalText = proposedFinalText;
        break;
      }

      const outputs = [];
      for (const call of calls) {
        const pendingSafetyChecks = Array.isArray(call.pending_safety_checks)
          ? call.pending_safety_checks.filter(Boolean)
          : [];
        let safetyApprovalHandled = false;
        let acknowledgedSafetyChecks = [];

        let latestCapture = currentObservationCapture;
        let latestFrontmost = latestCapture?.focusContext || await adapter.getFocusContext().catch(() => ({}));
        const requestedActions = call.actions.length ? call.actions : [{ type: "screenshot" }];
        const actions = safeComputerActionBatch(requestedActions);
        if (actions.length < requestedActions.length) {
          writeAmbientLog("computer_use_action_batch_limited", {
            requestId: approval.requestId,
            approvalId: approval.approvalId,
            sessionId: approval.sessionId || null,
            requestedActions: requestedActions.length,
            executedActions: actions.length,
            requestedTypes: requestedActions.map(normalizeComputerActionType),
            executedTypes: actions.map(normalizeComputerActionType)
          });
        }

        const executedActions = [];
        let criticalDenial = null;
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
          assertComputerUseNotCancelled(runControl);
          const action = actions[actionIndex];
          const nextAction = actions[actionIndex + 1] || null;
          if (step >= computerUseMaxActions) {
            throw new Error(`Computer Use stopped after ${computerUseMaxActions} actions before it kept operating without verified progress.`);
          }
          step += 1;
          const frontmost = latestFrontmost || {};
          const normalizedActionType = normalizeComputerActionType(action);
          if (["wait", "screenshot", "move"].includes(normalizedActionType)) {
            consecutiveNoProgressActions += 1;
          } else {
            consecutiveNoProgressActions = 0;
          }
          if (consecutiveNoProgressActions > computerUseNoProgressActionLimit) {
            throw new Error("Computer Use made several low-progress actions in a row, so I stopped before it kept waiting or moving without a plan.");
          }
          if (!adapter.background && normalizedActionType === "type" && /chrome|browser|safari|arc|edge|firefox/i.test(frontmost.activeApp || "")) {
            browserNavigationAttempt = {
              app: frontmost.activeApp || "",
              beforeTitle: frontmost.activeWindowTitle || "",
              textLength: String(action.text || "").length
            };
          }

          const targetDescription = await adapter.describeTarget?.(action, latestCapture).catch(() => null) || null;
          const stepEntry = {
            step,
            approvalId: approval.approvalId || null,
            goal: approval.goal || approval.task || "",
            label: summarizeComputerAction(action, frontmost, {
              task: approval.task,
              reasoningStatus,
              target: targetDescription,
              background: Boolean(adapter.background)
            }),
            status: "running",
            app: frontmost.activeApp || null,
            windowTitle: frontmost.activeWindowTitle || null,
            surface: adapter.background ? "background_browser" : "live_mac",
            url: frontmost.browserUrl || null,
            actionType: String(action?.type || "unknown"),
            target: targetDescription?.label || null,
            detail: targetDescription?.href ? compactBackgroundSnapshotUrl(targetDescription.href) : null
          };
          const actionLogDetails = computerActionLogDetails(action, latestCapture);
          if (adapter.background && Number.isFinite(Number(action?.x)) && Number.isFinite(Number(action?.y))) {
            const browserPoint = mapBackgroundBrowserPoint(action, latestCapture);
            actionLogDetails.browserX = Math.round(browserPoint.x);
            actionLogDetails.browserY = Math.round(browserPoint.y);
          }
          if (targetDescription) actionLogDetails.target = targetDescription;
          const blockedActionReason = adapter.background
            ? blockedBackgroundBrowserActionReason({
                task: approval.task,
                action,
                target: targetDescription
              })
            : "";
          const criticalRisk = detectComputerUseCriticalAction({
            task: approval.task,
            action,
            target: targetDescription,
            frontmost,
            reasoningStatus
          }) || (!safetyApprovalHandled && pendingSafetyChecks.length && !["wait", "screenshot", "move"].includes(normalizedActionType)
            ? {
                category: "provider_safety",
                title: "Approve safety check?",
                consequence: "The model provider marked this computer action as requiring explicit confirmation.",
                actionLabel: stepEntry.label,
                message: pendingSafetyChecks[0]?.message || "The model provider marked this computer action as requiring explicit confirmation.",
                riskText: truncateText(JSON.stringify(pendingSafetyChecks), 500)
              }
            : null);
          const actionFingerprint = computerActionFingerprint(action);
          if (!["wait", "screenshot"].includes(normalizedActionType)) {
            if (actionFingerprint === lastActionFingerprint) {
              repeatedActionCount += 1;
            } else {
              lastActionFingerprint = actionFingerprint;
              repeatedActionCount = 1;
            }
            if (repeatedActionCount > computerUseRepeatedActionLimit) {
              stepEntry.status = "failed";
              stepEntry.errorMessage = "Computer Use repeated the same action without visible progress.";
              sendStream("computer_action", { action: stepEntry });
              writeAmbientLog("computer_use_repeated_action_blocked", {
                requestId: approval.requestId,
                approvalId: approval.approvalId,
                sessionId: approval.sessionId || null,
                step,
                label: stepEntry.label,
                action: actionLogDetails,
                repeatedActionCount
              });
              throw new Error("Computer Use repeated the same action without visible progress, so I stopped before it kept clicking blindly.");
            }
          }

          computerUseSteps.push(stepEntry);
          if (blockedActionReason) {
            stepEntry.status = "skipped";
            stepEntry.label = "Skipped sign-in control in background browser";
            stepEntry.errorMessage = blockedActionReason;
            sendStatus("Skipping sign-in");
            sendStream("computer_action", { action: stepEntry });
            void updateComputerUseUserActionSteps(approval, computerUseSteps);
            localUpdateComputerUseTaskState(approval, stepEntry, "running");
            writeAmbientLog("computer_use_background_action_blocked", {
              requestId: approval.requestId,
              approvalId: approval.approvalId,
              sessionId: approval.sessionId || null,
              step,
              reason: blockedActionReason,
              action: actionLogDetails
            });
            localRecordComputerUseAction({
              sessionId: approval.sessionId,
              step,
              callId: call.call_id || call.id,
              actionType: String(action?.type || "unknown"),
              status: "skipped",
              adapter: adapter.kind,
              background: true,
              app: frontmost.activeApp || undefined,
              windowTitle: frontmost.activeWindowTitle || undefined,
              display: latestCapture.display,
              action,
              errorMessage: blockedActionReason
            });
            continue;
          }
          if (criticalRisk) {
            stepEntry.status = "needs_approval";
            stepEntry.riskCategory = criticalRisk.category;
            stepEntry.errorMessage = "";
            stepEntry.label = `Needs approval: ${stepEntry.label}`;
          }
          sendStatus(computerActionStatus(action, { background: Boolean(adapter.background) }));
          sendStream("computer_action", { action: stepEntry });
          void updateComputerUseUserActionSteps(approval, computerUseSteps);
          localUpdateComputerUseTaskState(approval, stepEntry, criticalRisk ? "waiting_approval" : "running");
          writeAmbientLog("computer_use_step_started", {
            requestId: approval.requestId,
            approvalId: approval.approvalId,
            sessionId: approval.sessionId || null,
            step,
            label: stepEntry.label,
            app: stepEntry.app,
            windowTitle: stepEntry.windowTitle,
            action: actionLogDetails
          });
          localRecordComputerUseAction({
            sessionId: approval.sessionId,
            step,
            callId: call.call_id || call.id,
            actionType: String(action?.type || "unknown"),
            status: "started",
            adapter: adapter.kind,
            background: Boolean(adapter.background),
            app: frontmost.activeApp || undefined,
            windowTitle: frontmost.activeWindowTitle || undefined,
            display: latestCapture.display,
            action
          });

          try {
            if (criticalRisk) {
              writeAmbientLog("computer_use_critical_approval_pending", {
                requestId: approval.requestId,
                approvalId: approval.approvalId,
                sessionId: approval.sessionId || null,
                step,
                category: criticalRisk.category,
                label: stepEntry.label,
                action: actionLogDetails
              });
              const decision = await waitForComputerUseCriticalApproval({
                sendStream,
                sendStatus,
                approval,
                runControl,
                risk: criticalRisk,
                stepEntry
              });
              assertComputerUseNotCancelled(runControl);
              if (decision.decision === "cancel") {
                stepEntry.status = "cancelled";
                stepEntry.errorMessage = "User cancelled before the critical action.";
                sendStream("computer_action", { action: stepEntry });
                void updateComputerUseUserActionSteps(approval, computerUseSteps);
                localUpdateComputerUseTaskState(approval, stepEntry, "cancelled");
                throw computerUseCancelledError();
              }
              if (decision.decision === "not_allow") {
                stepEntry.status = "denied";
                stepEntry.errorMessage = "User did not allow this critical action.";
                sendStream("computer_action", { action: stepEntry });
                void updateComputerUseUserActionSteps(approval, computerUseSteps);
                localUpdateComputerUseTaskState(approval, stepEntry, "running");
                if (pendingSafetyChecks.length && !safetyApprovalHandled) {
                  safetyApprovalHandled = true;
                }
                localRecordComputerUseAction({
                  sessionId: approval.sessionId,
                  step,
                  callId: call.call_id || call.id,
                  actionType: String(action?.type || "unknown"),
                  status: "denied",
                  adapter: adapter.kind,
                  background: Boolean(adapter.background),
                  app: frontmost.activeApp || undefined,
                  windowTitle: frontmost.activeWindowTitle || undefined,
                  display: latestCapture.display,
                  action,
                  errorMessage: stepEntry.errorMessage
                });
                criticalDenial = {
                  category: criticalRisk.category,
                  label: criticalRisk.actionLabel || stepEntry.label,
                  message: stepEntry.errorMessage
                };
                writeAmbientLog("computer_use_critical_action_denied", {
                  requestId: approval.requestId,
                  approvalId: approval.approvalId,
                  sessionId: approval.sessionId || null,
                  step,
                  category: criticalRisk.category,
                  label: criticalRisk.actionLabel || stepEntry.label
                });
                break;
              }
              if (pendingSafetyChecks.length && !safetyApprovalHandled) {
                acknowledgedSafetyChecks = pendingSafetyChecks;
                safetyApprovalHandled = true;
              }
              stepEntry.status = "running";
              stepEntry.label = stepEntry.label.replace(/^Needs approval:\s*/i, "");
              stepEntry.approvedCriticalAction = true;
              sendStream("computer_action", { action: stepEntry });
              void updateComputerUseUserActionSteps(approval, computerUseSteps);
              localUpdateComputerUseTaskState(approval, stepEntry, "running");
              writeAmbientLog("computer_use_critical_action_approved", {
                requestId: approval.requestId,
                approvalId: approval.approvalId,
                sessionId: approval.sessionId || null,
                step,
                category: criticalRisk.category,
                label: criticalRisk.actionLabel || stepEntry.label
              });
            }
            const actionStartedAt = Date.now();
            const executionResult = await actionQueue.run({
              action,
              capture: latestCapture,
              context: {
                task: approval.task,
                step,
                approvalId: approval.approvalId
              },
              actionLogDetails
            });
            executedActions.push(action);
            const postActionWaitMs = computerUsePostActionWaitMs(action, nextAction);
            if (postActionWaitMs > 0) await sleepForComputerUse(postActionWaitMs, runControl);
            assertComputerUseNotCancelled(runControl);
            stepEntry.verified = Boolean(executionResult?.verified);
            stepEntry.retried = Boolean(executionResult?.retried);
            stepEntry.verificationStrength = adapter.verificationStrength || "unknown";
            stepEntry.status = "succeeded";
            sendStream("computer_action", { action: stepEntry });
            void updateComputerUseUserActionSteps(approval, computerUseSteps);
            localUpdateComputerUseTaskState(approval, stepEntry, "running");
            writeAmbientLog("computer_use_step_succeeded", {
              requestId: approval.requestId,
              approvalId: approval.approvalId,
              sessionId: approval.sessionId || null,
              step,
              label: stepEntry.label,
              action: actionLogDetails,
              verified: Boolean(executionResult?.verified),
              retried: Boolean(executionResult?.retried),
              postActionWaitMs,
              actionDurationMs: Date.now() - actionStartedAt
            });
            localRecordComputerUseAction({
              sessionId: approval.sessionId,
              step,
              callId: call.call_id || call.id,
              actionType: String(action?.type || "unknown"),
              status: "succeeded",
              adapter: adapter.kind,
              background: Boolean(adapter.background),
              app: frontmost.activeApp || undefined,
              windowTitle: frontmost.activeWindowTitle || undefined,
              display: latestCapture.display,
              action,
              verified: Boolean(executionResult?.verified),
              retried: Boolean(executionResult?.retried),
              verificationStrength: adapter.verificationStrength || "unknown"
            });
          } catch (actionError) {
            const actionCancelled = actionError?.code === "computer_use_cancelled";
            stepEntry.status = actionCancelled ? "cancelled" : "failed";
            stepEntry.errorMessage = actionCancelled
              ? (stepEntry.errorMessage || "Computer Use stopped.")
              : actionError?.message || String(actionError);
            sendStream("computer_action", { action: stepEntry });
            void updateComputerUseUserActionSteps(approval, computerUseSteps);
            localUpdateComputerUseTaskState(approval, stepEntry, actionCancelled ? "cancelled" : "failed");
            writeAmbientLog("computer_use_step_failed", {
              requestId: approval.requestId,
              approvalId: approval.approvalId,
              sessionId: approval.sessionId || null,
              step,
              label: stepEntry.label,
              action: actionLogDetails,
              errorMessage: stepEntry.errorMessage
            });
            localRecordComputerUseAction({
              sessionId: approval.sessionId,
              step,
              callId: call.call_id || call.id,
              actionType: String(action?.type || "unknown"),
              status: actionCancelled ? "cancelled" : "failed",
              adapter: adapter.kind,
              background: Boolean(adapter.background),
              app: frontmost.activeApp || undefined,
              windowTitle: frontmost.activeWindowTitle || undefined,
              display: latestCapture.display,
              action,
              errorMessage: actionError?.message || String(actionError)
            });
            throw actionError;
          }
        }

        sendStatus(adapter.background ? "Reading background browser" : "Reading screen");
        assertComputerUseNotCancelled(runControl);
        const batchSettleWaitMs = computerUseBatchSettleWaitMs(executedActions);
        if (batchSettleWaitMs > 0) await sleepForComputerUse(batchSettleWaitMs, runControl);
        latestFrontmost = await adapter.getFocusContext().catch(() => ({}));
        latestCapture = await adapter.capture({ focusContext: latestFrontmost });
        assertComputerUseNotCancelled(runControl);
        currentObservationCapture = latestCapture;
        const nextObservationFingerprint = computerObservationFingerprint(latestCapture);
        const meaningfulActionCount = executedActions
          .map(normalizeComputerActionType)
          .filter((type) => !["wait", "screenshot", "move"].includes(type))
          .length;
        meaningfulActionTotal += meaningfulActionCount;
        if (meaningfulActionCount && nextObservationFingerprint === lastObservationFingerprint) {
          consecutiveNoProgressActions += 1;
          writeAmbientLog("computer_use_no_visual_progress", {
            requestId: approval.requestId,
            approvalId: approval.approvalId,
            sessionId: approval.sessionId || null,
            adapter: adapter.kind,
            consecutiveNoProgressActions,
            actionTypes: executedActions.map(normalizeComputerActionType)
          });
          if (consecutiveNoProgressActions > computerUseNoProgressActionLimit) {
            throw new Error("Computer Use did not produce visible progress after several actions, so I stopped before it kept operating blindly.");
          }
        } else if (meaningfulActionCount) {
          consecutiveNoProgressActions = 0;
        }
        lastObservationFingerprint = nextObservationFingerprint;
        const savedDownloadsNow = Array.isArray(adapter.savedDownloads) ? adapter.savedDownloads.filter((item) => item?.path) : [];
        if (adapter.background && savedDownloadsNow.length && extractPublicImageDownloadSubject(approval.task)) {
          const latestSaved = savedDownloadsNow.at(-1);
          finalText = `Saved the image to ${latestSaved.path}`;
          writeAmbientLog("computer_use_completed_after_download", {
            requestId: approval.requestId,
            approvalId: approval.approvalId,
            sessionId: approval.sessionId || null,
            path: latestSaved.path,
            step
          });
          break;
        }
        if (criticalDenial) browserNavigationAttempt = null;
        if (browserNavigationAttempt) {
          const afterTitle = String(latestFrontmost?.activeWindowTitle || "");
          const stillNewTab = /\bnew tab\b/i.test(afterTitle);
          const unchanged = Boolean(browserNavigationAttempt.beforeTitle) && afterTitle === browserNavigationAttempt.beforeTitle;
          if (stillNewTab || unchanged) {
            browserNavigationStallCount += 1;
            writeAmbientLog("computer_use_browser_navigation_stalled", {
              requestId: approval.requestId,
              approvalId: approval.approvalId,
              sessionId: approval.sessionId || null,
              attempts: browserNavigationStallCount,
              beforeTitle: browserNavigationAttempt.beforeTitle || null,
              afterTitle: afterTitle || null,
              typedTextLength: browserNavigationAttempt.textLength
            });
            if (browserNavigationStallCount >= 2) {
              throw new Error("Computer Use could not get the browser address/search field to navigate after two attempts, so I stopped before it kept opening tabs or typing blindly.");
            }
          } else if (afterTitle) {
            browserNavigationStallCount = 0;
          }
          browserNavigationAttempt = null;
        }
        outputs.push({
          type: "computer_call_output",
          call_id: call.call_id || call.id,
          ...(acknowledgedSafetyChecks.length ? { acknowledged_safety_checks: acknowledgedSafetyChecks } : {}),
          output: {
            type: "computer_screenshot",
            image_url: latestCapture.dataUrl,
            detail: computerUseDetailForPayload()
          }
        });
        if (criticalDenial) {
          outputs.push({
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `User did not allow the critical ${criticalDenial.category || "action"} action: ${criticalDenial.label || "critical action"}.`,
                  "Do not retry that same irreversible action unless the user explicitly asks and approves a new prompt.",
                  "Continue only if there is a safe alternative; otherwise stop and explain that the action was not allowed."
                ].join(" ")
              }
            ]
          });
        }
      }

      if (finalText) break;
      response = await callOpenAIComputerResponse({
        apiKey,
        model: computerUseRuntimeModel,
        instructions: computerUseInstructions,
        safetyIdentifier: safetyIdentifierForSession(),
        signal: runControl?.abortController?.signal,
        previousResponseId: response.id,
        input: outputs
      });
    }
    }

    if (!finalText) {
      const calls = extractComputerCalls(response);
      if (calls.length) {
        throw new Error("Computer Use reached its model-turn budget before it could verify completion. This safety limit prevents runaway clicking; the task can be retried or continued with a narrower next step.");
      }
      finalText = normalizeAmbientResponseText(extractOpenAIText(response)) || "Done. I finished that task.";
    }
    const savedDownloads = Array.isArray(adapter.savedDownloads) ? adapter.savedDownloads.filter((item) => item?.path) : [];
    if (savedDownloads.length) {
      const savedText = savedDownloads.map((item) => item.path).join("\n");
      if (!savedDownloads.some((item) => finalText.includes(item.path))) {
        finalText = `${finalText}\n\nSaved download${savedDownloads.length === 1 ? "" : "s"}:\n${savedText}`;
      }
    }

    const assistantMessage = localAddAmbientMessage({
      threadId: approval.threadId,
      role: "assistant",
      text: finalText,
      status: "completed",
      provider: computerUseProvider,
      model: computerUseRuntimeModel,
      credentialSource: computerUseCredentialSource,
      contextSnapshotId: approval.contextSnapshotId,
      metadata: {
        requestId: approval.requestId,
        computerUseSessionId: approval.sessionId,
        computerUseSteps: step,
        computerUseAdapter: adapter.kind,
        computerUseBackground: Boolean(adapter.background),
        savedDownloads
      }
    });
    void updateComputerUseUserActionSteps(approval, computerUseSteps);
    localUpdateComputerUseSession({
      sessionId: approval.sessionId,
      status: "succeeded",
      finalText,
      metadata: {
        steps: step,
        stepLog: computerUseSteps,
        adapter: adapter.kind,
        background: Boolean(adapter.background),
        savedDownloads,
        completedAt: new Date().toISOString()
      }
    });
    void logModelUsageEvent({
      provider: computerUseProvider,
      model: computerUseRuntimeModel,
      credentialSource: computerUseCredentialSource,
      feature: "computer_use",
      operation: "computer_use_run",
      status: "succeeded",
      requestId: approval.requestId,
      durationMs: Date.now() - startedAt,
      metadata: {
        adapter: adapter.kind,
        background: Boolean(adapter.background)
      }
    });
    notifyMainWindow("ambient:history-changed", { threadId: approval.threadId });
    return {
      ok: true,
      threadId: approval.threadId,
      answer: normalizeAmbientMessageDoc(assistantMessage),
      steps: step,
      text: finalText
    };
  } catch (error) {
    if (error?.code === "computer_use_cancelled") {
      writeAmbientLog("computer_use_stopped", {
        requestId: approval.requestId,
        approvalId: approval.approvalId,
        threadId: approval.threadId,
        sessionId: approval.sessionId || null,
        step
      });
      localUpdateComputerUseSession({
        sessionId: approval.sessionId,
        status: "cancelled",
        metadata: {
          steps: step,
          stepLog: computerUseSteps,
          adapter: adapter.kind,
          background: Boolean(adapter.background),
          stoppedAt: new Date().toISOString()
        }
      });
      void updateComputerUseUserActionSteps(approval, computerUseSteps.map((item) => (
        item.status === "running" ? { ...item, status: "cancelled" } : item
      )));
      void logModelUsageEvent({
        provider: computerUseProvider,
        model: computerUseRuntimeModel,
        credentialSource: computerUseCredentialSource,
        feature: "computer_use",
        operation: "computer_use_run",
        status: "cancelled",
        requestId: approval.requestId,
        durationMs: Date.now() - startedAt,
        metadata: {
          adapter: adapter.kind,
          background: Boolean(adapter.background)
        }
      });
      throw error;
    }
    const blocker = computerUseBlockerFromError(error, {
      approval,
      adapter,
      step,
      lastStep: computerUseSteps.at(-1) || null
    });
    error.computerUseBlocker = blocker;
    error.publicMessage = blocker.message;
    const errorText = blocker.message || error?.message || "Computer Use could not finish that task.";
    writeAmbientLog("computer_use_failed", {
      requestId: approval.requestId,
      approvalId: approval.approvalId,
      threadId: approval.threadId,
      sessionId: approval.sessionId || null,
      model: computerUseRuntimeModel,
      adapter: adapter.kind,
      background: Boolean(adapter.background),
      step,
      blocker,
      errorMessage: errorText,
      ...diagnosticErrorDetails(error)
    });
    localUpdateComputerUseSession({
      sessionId: approval.sessionId,
      status: "failed",
      errorMessage: errorText,
      blocker,
      metadata: {
        steps: step,
        stepLog: computerUseSteps,
        adapter: adapter.kind,
        background: Boolean(adapter.background),
        blocker,
        failedAt: new Date().toISOString()
      }
    });
    void logModelUsageEvent({
      provider: computerUseProvider,
      model: computerUseRuntimeModel,
      credentialSource: computerUseCredentialSource,
      feature: "computer_use",
      operation: "computer_use_run",
      status: "failed",
      requestId: approval.requestId,
      durationMs: Date.now() - startedAt,
      errorCode: "computer_use_failed",
      errorMessage: errorText,
      metadata: {
        adapter: adapter.kind,
        background: Boolean(adapter.background)
      }
    });
    throw error;
  } finally {
    actionQueue.clear();
    setAmbientComputerPassthrough(false);
    hideComputerUseOverlay();
    setAmbientWindowDefaultLevel("computer_use_finished");
  }

  }

  return {
    runComputerUseSession
  };
}

module.exports = {
  createComputerUseSessionRunner
};
