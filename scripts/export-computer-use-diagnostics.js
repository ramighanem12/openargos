#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function usage() {
  console.log([
    "Usage: npm run diagnostics:computer-use -- [--out diagnostics.json] [--limit 25] [--include-actions]",
    "",
    "Exports redacted Computer Use session diagnostics from local OpenArgos state.",
    "The export excludes screenshots and provider keys."
  ].join("\n"));
}

if (hasFlag("--help") || hasFlag("-h")) {
  usage();
  process.exit(0);
}

const settingsPath = argValue(
  "--settings",
  path.join(os.homedir(), "Library", "Application Support", "OpenArgos", "settings.json")
);
const limit = Math.max(1, Math.min(200, Number.parseInt(argValue("--limit", "25"), 10) || 25));
const includeActions = hasFlag("--include-actions");
const defaultOut = path.join(
  process.cwd(),
  `openargos-computer-use-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
const outPath = path.resolve(argValue("--out", defaultOut));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function redactText(value = "", maxLength = 1200) {
  const text = String(value || "")
    .replace(/\b(?:sk|xai|sk-ant|sk-or)-[A-Za-z0-9._-]{12,}\b/g, "[redacted-key]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
    .replace(/\b(?:password|token|secret|api key|apikey)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "[redacted-image-data]");
  return text.length > maxLength ? `${text.slice(0, maxLength - 12)} [truncated]` : text;
}

function redactValue(value, depth = 0) {
  if (depth > 5) return "[truncated-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => redactValue(item, depth + 1));
  if (typeof value !== "object") return String(value);
  const output = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/apiKey|credential|secret|password|token|screenshot|dataUrl|image_url|imageUrl/i.test(key)) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = redactValue(raw, depth + 1);
  }
  return output;
}

function compactSession(session = {}) {
  const metadata = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
  return {
    id: session._id || session.id || null,
    createdAt: session.createdAt || null,
    updatedAt: session.updatedAt || null,
    status: session.status || "",
    task: redactText(session.task || session.goal || "", 500),
    goal: redactText(session.goal || "", 500),
    adapter: session.adapter || metadata.adapter || "",
    background: Boolean(session.background || metadata.background),
    provider: session.provider || "",
    model: session.model || "",
    finalText: redactText(session.finalText || "", 1000),
    errorMessage: redactText(session.errorMessage || "", 1000),
    blocker: redactValue(session.blocker || metadata.blocker || null),
    lastKnownState: redactValue(session.lastKnownState || null),
    executionTrace: redactValue(metadata.executionTrace || null),
    metadata: redactValue({
      plannerRoute: metadata.plannerRoute,
      plannerSurface: metadata.plannerSurface,
      plannerReason: metadata.plannerReason,
      adapterReason: metadata.adapterReason,
      steps: metadata.steps,
      savedDownloads: metadata.savedDownloads,
      completedAt: metadata.completedAt,
      failedAt: metadata.failedAt,
      stoppedAt: metadata.stoppedAt,
      interruptedAt: metadata.interruptedAt
    })
  };
}

function compactAction(action = {}) {
  return {
    id: action._id || action.id || null,
    createdAt: action.createdAt || null,
    sessionId: action.sessionId || "",
    step: action.step || null,
    actionType: action.actionType || "",
    status: action.status || "",
    adapter: action.adapter || "",
    background: Boolean(action.background),
    app: redactText(action.app || "", 160),
    windowTitle: redactText(action.windowTitle || "", 240),
    verified: typeof action.verified === "boolean" ? action.verified : undefined,
    retried: typeof action.retried === "boolean" ? action.retried : undefined,
    verificationStrength: action.verificationStrength || "",
    errorMessage: redactText(action.errorMessage || "", 800),
    action: redactValue(action.action || null)
  };
}

if (!fs.existsSync(settingsPath)) {
  console.error(`OpenArgos settings file not found: ${settingsPath}`);
  process.exit(66);
}

const settings = readJson(settingsPath);
const localStore = settings.localStore && typeof settings.localStore === "object"
  ? settings.localStore
  : {};
const sessions = (Array.isArray(localStore.computerUseSessions) ? localStore.computerUseSessions : [])
  .slice()
  .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
  .slice(0, limit);
const sessionIds = new Set(sessions.map((session) => session._id || session.id).filter(Boolean));
const actions = includeActions
  ? (Array.isArray(localStore.computerUseActions) ? localStore.computerUseActions : [])
    .filter((action) => sessionIds.has(action.sessionId))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
    .map(compactAction)
  : [];

const diagnostics = {
  exportedAt: new Date().toISOString(),
  source: "openargos-local-state",
  settingsPath,
  sessionCount: sessions.length,
  actionCount: actions.length,
  sessions: sessions.map(compactSession),
  ...(includeActions ? { actions } : {})
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
