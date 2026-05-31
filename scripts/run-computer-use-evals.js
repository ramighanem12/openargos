#!/usr/bin/env node
"use strict";

const { createComputerUseEvalSuite } = require("../electron/computer-use/evals");
const { createComputerUseActionVerifier } = require("../electron/computer-use/action-verifier");
const { createComputerUseExecutor } = require("../electron/computer-use/executor");
const { createComputerUsePlanner } = require("../electron/computer-use/planner");
const { createComputerUseSafetyGate } = require("../electron/computer-use/safety-gate");
const { createComputerUseSurfaceRouter } = require("../electron/computer-use/surface-router");

function normalizeComputerIntentText(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function truncateText(value = "", maxLength = 6000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function detectAmbientMemorySaveIntent(question = "") {
  const match = String(question || "").match(/\b(?:remember|save to memory|save this)\b\s+(?:that\s+)?(.+)/i);
  return match?.[1] ? { text: match[1].trim() } : null;
}

function detectComputerUseStatusQuery(question = "") {
  return /\b(?:is|does|did|can)\b.*\bcomputer use\b.*\b(?:on|enabled|work|working|active)\b/i.test(question);
}

function rejectsComputerUseIntent(question = "") {
  return /\b(?:don't|do not|stop|without)\s+(?:use|using)\s+computer use\b/i.test(question);
}

function textLooksLikeComputerUseTask(question = "") {
  return /\b(?:download|save|open|go to|click|use my computer|play|delete|find|tell me my last|reorder)\b/i.test(question);
}

function textLooksLikeComputerUseFollowup(question = "") {
  return /^(?:now|again|redo|retry|same|another|his|her|their|it|that|this)\b/i.test(String(question || "").trim()) ||
    /\b(?:i asked you to|i told you to|are you not (?:downloading|saving|opening|playing|doing) it|you gonna do it|do it|do that)\b/i.test(question);
}

function extractRequestedImageFilenameClause(task = "") {
  return String(task || "").replace(/\b(?:and\s+)?name\s+the\s+file\s+.+$/i, "").trim();
}

function extractPublicImageDownloadSubject(task = "") {
  const raw = extractRequestedImageFilenameClause(task);
  if (!/\b(?:download|save|get|find|grab)\b/i.test(raw) || !/\b(?:photo|image|picture|logo|icon)\b/i.test(raw)) return "";
  const match = raw.match(/\b(?:photo|image|picture|logo|icon)\s+(?:of|for)\s+(.+?)\s*$/i) ||
    raw.match(/\b(?:download|save|get|find|grab)\s+(?:a|an|the)?\s*(?:photo|image|picture|logo|icon)\s*(?:of|for)?\s+(.+?)\s*$/i);
  return String(match?.[1] || "").trim();
}

function resolveImageDownloadFollowupTask() {
  return "";
}

function hasRecentComputerUseContext(messages = []) {
  return messages.some((message) => message?.metadata?.actionFamily === "computer_use");
}

function resolveComputerUseTask(question, _recentMessages = [], { taskState = null } = {}) {
  const text = String(question || "").trim();
  if (textLooksLikeComputerUseFollowup(text) && taskState?.task) return `${taskState.task}; continue with: ${text}`;
  return text;
}

function detectComputerUseIntent(question, { recentMessages = [], taskState = null } = {}) {
  return textLooksLikeComputerUseTask(question) ||
    (textLooksLikeComputerUseFollowup(question) && (taskState?.task || hasRecentComputerUseContext(recentMessages)));
}

function extractLeadershipRoleQuery(value = "") {
  const match = String(value || "").match(/\b(ceo|founder|president|cto|cfo|coo)\s+(?:of|at|for)\s+([^,.;!?]+)/i);
  return match ? { role: match[1].toUpperCase(), organization: match[2].trim() } : null;
}

function extractComputerUseUrlFromTask(task = "") {
  const match = String(task || "").match(/\bhttps?:\/\/\S+|www\.\S+/i);
  if (!match) return "";
  return match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
}

function initialBackgroundBrowserUrlForTask(task = "") {
  const subject = extractPublicImageDownloadSubject(task);
  if (subject) return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${subject} photo`)}`;
  return extractComputerUseUrlFromTask(task) || `https://www.google.com/search?q=${encodeURIComponent(task)}`;
}

function criticalActionCategory(text = "") {
  const source = String(text || "").toLowerCase();
  if (/\b(delete|remove|trash)\b/.test(source)) return {
    category: "delete",
    title: "Approve deleting?",
    consequence: "This may delete, remove, or trash data."
  };
  return null;
}

function detectCriticalAction({ task = "", target = null } = {}) {
  const category = criticalActionCategory(`${task} ${target?.label || ""} ${target?.role || ""}`);
  return category ? { ...category, actionLabel: target?.label || "Critical action" } : null;
}

function blockedBackgroundBrowserActionReason({ task = "", target = null } = {}) {
  if (/\b(doordash|gmail|account|login|sign in)\b/i.test(task)) return "";
  const text = `${target?.label || ""} ${target?.href || ""}`.toLowerCase();
  return /\b(sign in|login|account|accounts\.google)\b/.test(text)
    ? "Skipped sign-in control for a public background task."
    : "";
}

async function main() {
  const planner = createComputerUsePlanner({
    truncateText,
    normalizeComputerIntentText,
    detectAmbientMemorySaveIntent,
    detectComputerUseStatusQuery,
    detectComputerUseIntent: (question, payload = {}) => detectComputerUseIntent(question, payload),
    resolveComputerUseTask,
    rejectsComputerUseIntent,
    textLooksLikeComputerUseTask,
    textLooksLikeComputerUseFollowup,
    extractPublicImageDownloadSubject,
    resolveImageDownloadFollowupTask,
    hasRecentComputerUseContext,
    compactComputerUseTaskStateText: () => "None"
  });
  const surfaceRouter = createComputerUseSurfaceRouter({
    normalizeComputerIntentText,
    extractPublicImageDownloadSubject,
    extractLeadershipRoleQuery,
    extractComputerUseUrlFromTask,
    initialBackgroundBrowserUrlForTask
  });
  const safetyGate = createComputerUseSafetyGate({
    pendingApprovals: new Map(),
    randomId: (prefix) => `${prefix}_eval`,
    timeoutMs: 100,
    truncateText
  });
  const executor = createComputerUseExecutor({
    normalizeComputerIntentText,
    normalizeAmbientResponseText: (value) => String(value || "").trim(),
    extractOpenAIText: (response) => String(response?.output_text || ""),
    truncateText
  });
  const actionVerifier = createComputerUseActionVerifier({
    normalizeComputerActionType: (action) => String(action?.type || "").toLowerCase().replace(/-/g, "_"),
    normalizedComputerActionKeys: (action) => (Array.isArray(action.keys) ? action.keys : [action.key || action.text].filter(Boolean))
      .map((key) => String(key || "").toUpperCase().replace("ENTER", "RETURN"))
      .filter(Boolean),
    fastMode: true
  });
  const suite = createComputerUseEvalSuite({
    planner,
    executor,
    actionVerifier,
    surfaceRouter,
    safetyGate,
    detectCriticalAction,
    blockedBackgroundBrowserActionReason
  });
  const result = await suite.run();
  for (const row of result.results) {
    const prefix = row.ok ? "PASS" : "FAIL";
    console.log(`${prefix} ${row.name}${row.ok ? "" : `: ${row.message}`}`);
  }
  console.log(`\n${result.passed}/${result.total} Computer Use harness evals passed.`);
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
