const eyebrow = document.querySelector("[data-eyebrow]");
const title = document.querySelector("[data-title]");
const detail = document.querySelector("[data-detail]");
const appName = document.querySelector("[data-app-name]");
const appPath = document.querySelector("[data-app-path]");
const appIcon = document.querySelector("[data-app-icon]");
const dragTarget = document.querySelector("[data-drag]");
const revealButton = document.querySelector("[data-reveal]");
const settingsButton = document.querySelector("[data-open-settings]");
const closeButton = document.querySelector("[data-close]");

function shortAppPath(value = "") {
  const text = String(value || "").trim();
  if (!text) return "OpenArgos.app";
  return text.replace(/^\/Applications\//, "/Applications/");
}

function renderState(state = {}) {
  if (eyebrow) eyebrow.textContent = state.eyebrow || "Permission";
  if (title) title.textContent = state.title || "Add OpenArgos";
  if (detail) detail.textContent = state.detail || "Drag OpenArgos into the macOS permission list if it is missing";
  if (appName) appName.textContent = state.appName || "OpenArgos";
  if (appPath) appPath.textContent = shortAppPath(state.appBundlePath);
  if (appIcon) {
    appIcon.src = state.iconPath ? `file://${state.iconPath}` : "../renderer/assets/openargos-ambient-icon.png";
  }
  if (dragTarget) dragTarget.disabled = !state.appBundlePath;
}

window.permissionHelper?.getState?.().then(renderState).catch(() => renderState());
window.permissionHelper?.onState?.(renderState);

dragTarget?.addEventListener("dragstart", (event) => {
  event.preventDefault();
  window.permissionHelper?.startAppDrag?.();
});

dragTarget?.addEventListener("click", () => {
  window.permissionHelper?.revealApp?.();
});

revealButton?.addEventListener("click", () => {
  window.permissionHelper?.revealApp?.();
});

settingsButton?.addEventListener("click", () => {
  window.permissionHelper?.openSettings?.();
});

closeButton?.addEventListener("click", () => {
  window.permissionHelper?.close?.();
});
