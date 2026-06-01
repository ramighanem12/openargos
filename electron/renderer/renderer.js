const tabs = Array.from(document.querySelectorAll(".tab"));
const pages = Array.from(document.querySelectorAll(".page"));
const shell = document.querySelector(".shell");
const sidebarPanels = Array.from(document.querySelectorAll("[data-sidebar-panel]"));
const settingsEntry = document.querySelector("[data-settings-entry]");
const menuDismiss = document.querySelector("[data-menu-dismiss]");
const newMenuTrigger = document.querySelector("[data-new-menu-trigger]");
const newChatControl = document.querySelector("[data-new-chat-control]");
const newChatDisabledTooltip = document.querySelector(".new-chat-disabled-tooltip");
const newChatTooltipTitle = document.querySelector("[data-new-chat-tooltip-title]");
const newChatTooltipBody = document.querySelector("[data-new-chat-tooltip-body]");
const newMenu = document.querySelector("[data-new-menu]");
const newMenuOptions = Array.from(document.querySelectorAll("[data-new-menu-action]"));
const chatsParent = document.querySelector("[data-chats-parent]");
const chatSubtabs = document.querySelector("[data-chat-subtabs]");
const chatSidebarGroup = chatsParent?.closest(".tab-group");
const chatActionMenu = document.querySelector("[data-chat-action-menu]");
const chatActionOptions = Array.from(document.querySelectorAll("[data-chat-action]"));
const chatPinLabel = document.querySelector("[data-chat-pin-label]");
const settingsFeaturesParent = document.querySelector("[data-settings-features-parent]");
const settingsFeaturesSubtabs = document.querySelector("[data-settings-features-subtabs]");
const backToApp = document.querySelector("[data-back-to-app]");
const historyViewTabs = Array.from(document.querySelectorAll("[data-history-view]"));
const taskViewTabs = Array.from(document.querySelectorAll("[data-task-view]"));
const taskPanels = Array.from(document.querySelectorAll("[data-task-panel]"));
const inboxRespondButtons = Array.from(document.querySelectorAll("[data-inbox-respond]"));
const inboxAddDetailsButtons = Array.from(document.querySelectorAll("[data-inbox-edit-response]"));
const inboxResponseModal = document.querySelector("[data-inbox-response-modal]");
const inboxResponseForm = document.querySelector("[data-inbox-response-form]");
const inboxResponseTitle = document.querySelector("[data-inbox-response-title]");
const inboxResponseDetail = document.querySelector("[data-inbox-response-detail]");
const inboxDetailsInput = document.querySelector("[data-inbox-details]");
const inboxResponseSubmit = document.querySelector("[data-inbox-response-submit]");
const inboxResponseCancel = document.querySelector("[data-inbox-response-cancel]");
const inboxAttachmentButton = document.querySelector("[data-inbox-attachment-button]");
const inboxAttachmentInput = document.querySelector("[data-inbox-attachment-input]");
const inboxAttachmentList = document.querySelector("[data-inbox-attachment-list]");
const inboxExpansionState = new WeakMap();

if (newChatDisabledTooltip) {
  document.body.append(newChatDisabledTooltip);
}

function applyWindowState(state = {}) {
  shell?.classList.toggle("window-fullscreen", Boolean(state.fullscreen));
}

window.openArgos?.getWindowState?.()
  .then(applyWindowState)
  .catch(() => applyWindowState());
window.openArgos?.onWindowStateChanged?.(applyWindowState);

const welcomeGate = document.querySelector("[data-welcome-gate]");
const welcomeText = document.querySelector("[data-welcome-text]");
let lastAppTab = "history";
let currentLocalSession = null;
let inboxAttachedFiles = [];
let historyView = "assistant";
const inboxExpansionDurationMs = 280;
const sidebarModeTransitionMs = 190;
const settingsFeaturesAnimationMs = 180;
let sidebarMode = shell?.classList.contains("settings-mode") ? "settings" : "app";
let sidebarModeTransitionTimer = 0;
let settingsFeaturesAnimationTimer = 0;
let chatSubtabsExpanded = true;
let activeSidebarChatId = "";
let chatSidebarMode = "page";
let activeChatActionSession = null;
let chatModalSession = null;
let chatSubtabsScrollFrame = 0;
let floatingMenuPositionFrame = 0;
const pinnedChatsKey = "pinnedChats";
let pinnedChatIds = [];
const lucidePaths = {
  check: '<path d="M20 6 9 17l-5-5" />',
  chevronDown: '<path d="m6 9 6 6 6-6" />',
  messageCircle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />',
  messageSquare: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
  messageCircleQuestion: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" /><path d="M12 17h.01" />',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />',
  view: '<path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" /><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" /><circle cx="12" cy="12" r="1" /><path d="M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0" />',
  reply: '<polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />',
  calendarClock: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><circle cx="16" cy="16" r="5" /><path d="M16 14v2l1.5 1" />',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" />',
  repeat2: '<path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" />',
  pin: '<path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />',
  bookSearch: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5z" /><circle cx="11.5" cy="8.5" r="2.5" /><path d="m13.3 10.3 2.2 2.2" />',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.6A6 6 0 1 0 7.5 11.4c.8.9 1.3 1.6 1.5 2.6" /><path d="M9 18h6" /><path d="M10 22h4" /><path d="M10 18a2 2 0 1 1 4 0" />',
  x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />',
  trash2: '<path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />',
  ellipsis: '<circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />',
  triangleAlert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />',
  userRound: '<circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />'
};

function lucideIcon(name, className = "") {
  const classAttr = className ? ` class="${className}"` : "";
  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true">${lucidePaths[name] || ""}</svg>`;
}

function hydrateLucideIcons(root = document) {
  root.querySelectorAll("[data-lucide-icon]").forEach((icon) => {
    const name = icon.getAttribute("data-lucide-icon");
    icon.innerHTML = lucideIcon(name);
  });
}

hydrateLucideIcons();

function setByokStatus(status, text, className = "", icon = "") {
  if (!status) return;
  status.className = "byok-status";
  if (className) status.classList.add(className);
  status.textContent = "";
  if (icon) {
    const iconWrap = document.createElement("span");
    iconWrap.className = "byok-status-icon";
    iconWrap.innerHTML = lucideIcon(icon);
    status.append(iconWrap);
  }
  const label = document.createElement("span");
  label.textContent = text;
  status.append(label);
}

const inboxResponseTemplates = {
  default: {
    title: "Add details",
    detail: "Add context, notes, or files for OpenArgos to turn into a response.",
    placeholder: "Add details for OpenArgos...",
    draft: ""
  }
};

function setSidebarPanelActive(panel, active) {
  panel.inert = !active;
  panel.setAttribute("aria-hidden", String(!active));
}

function setSettingsBackButtonActive(active) {
  if (!backToApp) return;
  backToApp.tabIndex = active ? 0 : -1;
  backToApp.setAttribute("aria-hidden", String(!active));
}

function finalizeSidebarMode() {
  shell?.classList.remove("sidebar-transitioning");
  sidebarPanels.forEach((panel) => {
    const active = panel.dataset.sidebarPanel === sidebarMode;
    panel.hidden = !active;
    setSidebarPanelActive(panel, active);
  });
}

function setSidebarMode(mode, options = {}) {
  const nextMode = mode === "settings" ? "settings" : "app";
  const inSettings = nextMode === "settings";
  window.clearTimeout(sidebarModeTransitionTimer);
  setSettingsBackButtonActive(inSettings);

  if (sidebarPanels.length === 0) {
    shell?.classList.toggle("settings-mode", inSettings);
    return;
  }

  const isSameSettledMode = sidebarMode === nextMode && !shell?.classList.contains("sidebar-transitioning");
  sidebarMode = nextMode;

  if (options.immediate || isSameSettledMode) {
    shell?.classList.toggle("settings-mode", inSettings);
    finalizeSidebarMode();
    return;
  }

  sidebarPanels.forEach((panel) => {
    const active = panel.dataset.sidebarPanel === nextMode;
    panel.hidden = false;
    setSidebarPanelActive(panel, active);
  });

  shell?.classList.add("sidebar-transitioning");
  shell?.getBoundingClientRect();
  shell?.classList.toggle("settings-mode", inSettings);
  sidebarModeTransitionTimer = window.setTimeout(finalizeSidebarMode, sidebarModeTransitionMs);
}

setSidebarMode(sidebarMode, { immediate: true });

function isSettingsFeaturesPage(pageId = "") {
  return String(pageId).startsWith("settings-features-");
}

function setSettingsFeaturesExpanded(expanded) {
  window.clearTimeout(settingsFeaturesAnimationTimer);
  settingsFeaturesParent?.setAttribute("aria-expanded", String(Boolean(expanded)));
  settingsFeaturesParent?.classList.toggle("is-expanded", Boolean(expanded));
  if (!settingsFeaturesSubtabs) return;

  if (expanded) {
    settingsFeaturesSubtabs.hidden = false;
    settingsFeaturesSubtabs.getBoundingClientRect();
    settingsFeaturesSubtabs.classList.add("is-expanded");
    return;
  }

  settingsFeaturesSubtabs.classList.remove("is-expanded");
  settingsFeaturesAnimationTimer = window.setTimeout(() => {
    if (!settingsFeaturesSubtabs.classList.contains("is-expanded")) {
      settingsFeaturesSubtabs.hidden = true;
    }
  }, settingsFeaturesAnimationMs);
}

function setChatSubtabsExpanded(expanded) {
  chatSubtabsExpanded = Boolean(expanded);
  chatsParent?.setAttribute("aria-expanded", String(chatSubtabsExpanded));
  chatsParent?.classList.toggle("is-expanded", chatSubtabsExpanded);
  if (!chatSubtabs) return;
  chatSubtabs.hidden = false;
  chatSubtabs.classList.toggle("is-expanded", chatSubtabsExpanded);
  scheduleChatSubtabsScrollStateUpdate();
}

function updateChatsParentState() {
  chatsParent?.classList.toggle("active", chatSidebarMode === "page");
}

function updateChatSubtabsScrollState() {
  if (!chatSubtabs) return;
  const scrollable = chatSubtabs.classList.contains("is-expanded")
    && chatSubtabs.scrollHeight > chatSubtabs.clientHeight + 1;
  const canScrollUp = scrollable && chatSubtabs.scrollTop > 1;
  const canScrollDown = scrollable
    && chatSubtabs.scrollTop + chatSubtabs.clientHeight < chatSubtabs.scrollHeight - 1;
  chatSubtabs.classList.toggle("can-scroll-up", canScrollUp);
  chatSubtabs.classList.toggle("can-scroll-down", canScrollDown);
}

function scheduleChatSubtabsScrollStateUpdate() {
  if (chatSubtabsScrollFrame) return;
  chatSubtabsScrollFrame = window.requestAnimationFrame(() => {
    chatSubtabsScrollFrame = 0;
    updateChatSubtabsScrollState();
  });
}

function forwardChatSidebarWheel(event) {
  if (!chatSubtabs || !chatSubtabsExpanded || !chatSubtabs.classList.contains("is-expanded")) return;
  if (chatSubtabs.contains(event.target)) return;
  const maxScrollTop = chatSubtabs.scrollHeight - chatSubtabs.clientHeight;
  if (maxScrollTop <= 1) return;
  const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chatSubtabs.clientHeight : 1;
  const nextScrollTop = Math.max(0, Math.min(maxScrollTop, chatSubtabs.scrollTop + event.deltaY * deltaUnit));
  if (Math.abs(nextScrollTop - chatSubtabs.scrollTop) < 0.5) return;
  chatSubtabs.scrollTop = nextScrollTop;
  event.preventDefault();
  scheduleChatSubtabsScrollStateUpdate();
}

function positionFloatingMenus() {
  positionModelMenu();
  positionVoiceModelMenu();
  positionComputerUseEngineMenu();
  positionAmbientSoundTypeMenu();
  positionNewMenu();
  positionChatActionMenu();
}

function scheduleFloatingMenuPositionUpdate() {
  if (floatingMenuPositionFrame) return;
  floatingMenuPositionFrame = window.requestAnimationFrame(() => {
    floatingMenuPositionFrame = 0;
    positionFloatingMenus();
  });
}

function resetHistorySearch({ render = true } = {}) {
  window.clearTimeout(historySearchTimer);
  historySearchQuery = "";
  historySearchRows = [];
  historySearchError = "";
  historySearchLoading = false;
  historySearchRequestId += 1;
  if (historySearchInput) historySearchInput.value = "";
  if (historySearchClear) historySearchClear.hidden = true;
  if (render) renderAmbientHistory();
}

function selectPage(id, { refreshHistory = true } = {}) {
  const pageId = id === "inbox" ? "history" : id;
  const previousPageId = document.querySelector(".page.active")?.id || "";
  if (previousPageId === "history" && pageId !== "history") {
    resetHistorySearch({ render: false });
  }
  tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === pageId));
  setSettingsFeaturesExpanded(isSettingsFeaturesPage(pageId));
  setChatSubtabsExpanded(pageId === "history" || chatSubtabsExpanded);
  pages.forEach((page) => {
    const active = page.id === pageId;
    page.classList.toggle("active", active);
    if (active) page.scrollTo({ top: 0, left: 0 });
  });
  if (pageId === "tasks") resetTaskView();
  if (pageId === "history") {
    chatSidebarMode = "page";
    activeSidebarChatId = "";
    updateChatsParentState();
    setChatSubtabsExpanded(true);
    setHistoryView("assistant", { render: false });
    if (refreshHistory) loadAmbientHistory({ force: true });
  }
  if (pageId === "settings-memory") void syncLocalMemories();
}

function openActivityPage() {
  setSidebarMode("app");
  lastAppTab = "history";
  selectPage("history");
}

function resetSessionNavigation() {
  closeNewMenu();
  openActivityPage();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;
    if (!id) return;
    if (!id.startsWith("settings-")) lastAppTab = id;
    selectPage(id);
  });
});

settingsFeaturesParent?.addEventListener("click", () => {
  setSettingsFeaturesExpanded(true);
  selectPage("settings-features-assistant");
});

function setHistoryView(view = "all", { render = true } = {}) {
  historyView = view === "assistant" ? "assistant" : "assistant";
  historyViewTabs.forEach((item) => item.classList.toggle("active", item.dataset.historyView === historyView));
  if (render) renderAmbientHistory();
}

historyViewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setHistoryView(tab.dataset.historyView || "all");
  });
});

function setTaskView(view = "in-progress") {
  taskViewTabs.forEach((item) => item.classList.toggle("active", item.dataset.taskView === view));
  taskPanels.forEach((panel) => {
    panel.hidden = panel.dataset.taskPanel !== view;
  });
}

taskViewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.taskView;
    setTaskView(view);
  });
});

function resetTaskView() {
  setTaskView("in-progress");
}

function clearInboxExpansion(panel) {
  const state = inboxExpansionState.get(panel);
  if (!state) return;
  window.clearTimeout(state.timeout);
  panel.removeEventListener("transitionend", state.handleTransitionEnd);
  inboxExpansionState.delete(panel);
}

function finishInboxExpansion(panel, onFinish) {
  let clear = () => {};
  const handleTransitionEnd = (event) => {
    if (event.target !== panel || event.propertyName !== "height") return;
    clear();
    onFinish();
  };
  const timeout = window.setTimeout(() => {
    clear();
    onFinish();
  }, inboxExpansionDurationMs + 34);

  clear = () => {
    window.clearTimeout(timeout);
    panel.removeEventListener("transitionend", handleTransitionEnd);
    const state = inboxExpansionState.get(panel);
    if (state?.handleTransitionEnd === handleTransitionEnd) inboxExpansionState.delete(panel);
  };

  inboxExpansionState.set(panel, { timeout, handleTransitionEnd });
  panel.addEventListener("transitionend", handleTransitionEnd);
}

function setInboxExpanded(row, expanded) {
  const panel = row?.querySelector("[data-inbox-expanded]");
  if (!panel) return false;

  clearInboxExpansion(panel);

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    panel.hidden = !expanded;
    panel.style.height = "";
    row.classList.remove("is-collapsing");
    row.classList.toggle("expanded", expanded);
    row.setAttribute("aria-expanded", String(expanded));
    return true;
  }

  if (expanded) {
    const currentHeight = panel.hidden ? 0 : panel.getBoundingClientRect().height;
    panel.hidden = false;
    row.classList.remove("is-collapsing");
    row.classList.add("expanded");
    row.setAttribute("aria-expanded", "true");
    panel.style.height = "auto";
    const targetHeight = panel.getBoundingClientRect().height;
    panel.style.height = `${currentHeight}px`;
    panel.getBoundingClientRect();

    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      panel.style.height = `${targetHeight}px`;
    }));

    finishInboxExpansion(panel, () => {
      if (!row.classList.contains("expanded")) return;
      panel.style.height = "auto";
    });
    return true;
  }

  const currentHeight = panel.getBoundingClientRect().height;
  panel.hidden = false;
  panel.style.height = `${currentHeight}px`;
  panel.getBoundingClientRect();
  window.requestAnimationFrame(() => {
    row.classList.add("is-collapsing");
    row.classList.remove("expanded");
    row.setAttribute("aria-expanded", "false");
    panel.style.height = "0px";
  });

  finishInboxExpansion(panel, () => {
    if (row.classList.contains("expanded")) return;
    panel.hidden = true;
    panel.style.height = "";
    row.classList.remove("is-collapsing");
  });
  return true;
}

function inboxAttachmentKey(file) {
  return [file.name, file.size, file.lastModified].join(":");
}

function inboxFileExtension(file) {
  const name = String(file?.name || "");
  return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
}

function inboxFileKind(file) {
  const extension = inboxFileExtension(file);
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "heic", "svg"].includes(extension)) return "image";
  if (extension === "pdf" || type === "application/pdf") return "pdf";
  if (["doc", "docx", "odt", "rtf", "pages"].includes(extension)) return "doc";
  if (["xls", "xlsx", "csv", "tsv", "ods", "numbers"].includes(extension)) return "sheet";
  return "file";
}

function inboxFileIcon(kind) {
  const icons = {
    sheet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M8 12h8" /><path d="M8 16h8" /><path d="M11 9v10" /></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M8 13h8" /><path d="M8 17h6" /></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M8 16h8" /><path d="M9 12h1.5a1.5 1.5 0 0 0 0-3H9v6" /></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="m4 16 4-4a2 2 0 0 1 2.8 0l4.2 4.2" /><path d="m14 14 1-1a2 2 0 0 1 2.8 0L20 15.2" /><circle cx="9" cy="8" r="1.5" /></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /></svg>'
  };
  return icons[kind] || icons.file;
}

function renderInboxAttachments() {
  if (!inboxAttachmentList) return;
  inboxAttachmentList.hidden = inboxAttachedFiles.length === 0;
  inboxAttachmentList.textContent = "";
  inboxAttachedFiles.forEach((file, index) => {
    const kind = inboxFileKind(file);
    const item = document.createElement("div");
    item.className = `inbox-attachment-pill inbox-attachment-${kind}`;

    const icon = document.createElement("span");
    icon.className = "inbox-attachment-icon";
    icon.innerHTML = inboxFileIcon(kind);

    const name = document.createElement("span");
    name.className = "inbox-attachment-name";
    name.textContent = file.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "inbox-attachment-remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.dataset.inboxAttachmentRemove = String(index);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>';

    item.append(icon, name, remove);
    inboxAttachmentList.append(item);
  });
}

function resetInboxAttachments() {
  inboxAttachedFiles = [];
  if (inboxAttachmentInput) inboxAttachmentInput.value = "";
  renderInboxAttachments();
}

function openInboxResponseModal(requestId, mode = "details") {
  if (!inboxResponseModal) return;
  const request = inboxResponseTemplates[requestId] || inboxResponseTemplates.default;
  if (inboxResponseTitle) inboxResponseTitle.textContent = mode === "edit" ? "Edit response" : "Add details";
  if (inboxResponseDetail) inboxResponseDetail.textContent = request.detail;
  if (inboxDetailsInput) {
    inboxDetailsInput.value = mode === "edit" ? request.draft : "";
    inboxDetailsInput.placeholder = request.placeholder;
  }
  resetInboxAttachments();
  setActionButtonLoading(inboxResponseSubmit, false, "Generate draft");
  inboxResponseModal.hidden = false;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => inboxDetailsInput?.focus({ preventScroll: true }));
}

function closeInboxResponseModal() {
  if (!inboxResponseModal) return;
  inboxResponseModal.hidden = true;
  document.body.classList.remove("modal-open");
}

inboxRespondButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Archived inbox rows are no longer interactive in the local chat-only build.
  });
});

inboxAddDetailsButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Archived inbox rows are no longer interactive in the local chat-only build.
  });
});

inboxAttachmentButton?.addEventListener("click", () => {
  inboxAttachmentInput?.click();
});

inboxAttachmentInput?.addEventListener("change", () => {
  const nextFiles = Array.from(inboxAttachmentInput.files || []);
  const existingKeys = new Set(inboxAttachedFiles.map(inboxAttachmentKey));
  nextFiles.forEach((file) => {
    const key = inboxAttachmentKey(file);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    inboxAttachedFiles.push(file);
  });
  inboxAttachmentInput.value = "";
  renderInboxAttachments();
});

inboxAttachmentList?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-inbox-attachment-remove]");
  if (!removeButton) return;
  inboxAttachedFiles.splice(Number(removeButton.dataset.inboxAttachmentRemove || 0), 1);
  renderInboxAttachments();
});

document.querySelectorAll("[data-source-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    void window.openArgos?.openExternal?.(link.href);
  });
});

inboxResponseCancel?.addEventListener("click", closeInboxResponseModal);

inboxResponseForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  setActionButtonLoading(inboxResponseSubmit, true, "Generating");
  window.setTimeout(() => {
    setActionButtonLoading(inboxResponseSubmit, false, "Generated");
    window.setTimeout(closeInboxResponseModal, 500);
  }, 500);
});

function openSettingsRoot() {
  closeNewMenu();
  setSidebarMode("settings");
  selectPage("settings-config");
}

function updateMenuDismissLayer() {
  if (!menuDismiss) return;
  const newMenuOpen = Boolean(newMenu && !newMenu.hidden);
  const chatMenuOpen = Boolean(chatActionMenu && !chatActionMenu.hidden);
  menuDismiss.hidden = !(newMenuOpen || chatMenuOpen);
}

function positionNewMenu() {
  if (!newMenuTrigger || !newMenu || newMenu.hidden) return;
  const rect = newMenuTrigger.getBoundingClientRect();
  const margin = 8;
  const width = Math.max(148, Math.round(rect.width * 0.8));
  newMenu.style.width = `${width}px`;
  const overlap = Math.min(70, Math.round(rect.width * 0.315));
  const rightPlacement = rect.right - overlap;
  const left = rightPlacement + width <= window.innerWidth - margin
    ? rightPlacement
    : Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
  const top = Math.min(rect.top, window.innerHeight - newMenu.offsetHeight - margin);
  newMenu.style.left = `${left}px`;
  newMenu.style.top = `${Math.max(margin, top)}px`;
}

function closeNewMenu() {
  if (newMenu) newMenu.hidden = true;
  newMenuTrigger?.setAttribute("aria-expanded", "false");
  updateMenuDismissLayer();
}

function positionChatActionMenu() {
  if (!chatActionMenu || chatActionMenu.hidden) return;
  const trigger = document.querySelector(`[data-chat-actions-for="${CSS.escape(activeChatActionSession?.id || "")}"]`);
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const width = 172;
  chatActionMenu.style.width = `${width}px`;
  const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
  const top = Math.min(rect.bottom + 5, window.innerHeight - chatActionMenu.offsetHeight - margin);
  chatActionMenu.style.left = `${left}px`;
  chatActionMenu.style.top = `${Math.max(margin, top)}px`;
}

function closeChatActionMenu() {
  if (chatActionMenu) chatActionMenu.hidden = true;
  document.querySelectorAll(".chat-child-row.menu-open").forEach((row) => {
    row.classList.remove("menu-open");
  });
  document.querySelectorAll("[data-chat-actions-for]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
  activeChatActionSession = null;
  updateMenuDismissLayer();
}

function openChatActionMenu(session = {}, trigger = null) {
  if (!chatActionMenu || !session?.id) return;
  closeNewMenu();
  closeModelMenu();
  activeChatActionSession = session;
  if (chatPinLabel) chatPinLabel.textContent = isChatPinned(session) ? "Unpin chat" : "Pin chat";
  chatActionMenu.hidden = false;
  if (trigger) {
    trigger.setAttribute("aria-expanded", "true");
    trigger.closest(".chat-child-row")?.classList.add("menu-open");
  }
  positionChatActionMenu();
  updateMenuDismissLayer();
}

function openNewMenu() {
  if (!newMenu) return;
  closeChatActionMenu();
  closeModelMenu();
  newMenu.hidden = false;
  newMenuTrigger?.setAttribute("aria-expanded", "true");
  positionNewMenu();
  updateMenuDismissLayer();
}

newMenuTrigger?.addEventListener("click", async (event) => {
  event.stopPropagation();
  if (newMenuTrigger.disabled) return;
  closeNewMenu();
  try {
    const result = await window.openArgos?.openAmbient?.({ forceNew: true });
    if (!result?.ok) throw new Error(result?.message || "Could not open chat.");
  } catch (error) {
    console.error("Failed to open new chat", error);
  }
});

newMenuOptions.forEach((option) => {
  option.addEventListener("click", async (event) => {
    event.stopPropagation();
    const action = option.dataset.newMenuAction;
    closeNewMenu();
    if (action === "chat") {
      await window.openArgos?.openAmbient?.({ forceNew: true });
      return;
    }
  });
});

chatActionOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.stopPropagation();
    const session = activeChatActionSession;
    const action = option.dataset.chatAction;
    closeChatActionMenu();
    if (!session?.id) return;
    if (action === "pin") {
      togglePinnedChat(session);
      return;
    }
    if (action === "rename") {
      setChatRenameModal(true, session);
      return;
    }
    if (action === "delete") {
      setChatDeleteModal(true, session);
    }
  });
});

settingsEntry?.addEventListener("click", (event) => {
  event.stopPropagation();
  openSettingsRoot();
});

menuDismiss?.addEventListener("click", () => {
  closeNewMenu();
  closeChatActionMenu();
});

backToApp?.addEventListener("click", () => {
  openActivityPage();
});

window.openArgos?.onNavigate?.((page) => {
  const pageId = String(page || "").trim();
  if (!pageId) return;
  if (pageId === "home" || pageId === "activity") {
    openActivityPage();
    return;
  }

  const normalizedPageId = pageId === "inbox" ? "history" : pageId;
  if (!document.getElementById(normalizedPageId)) return;
  const isSettingsPage = normalizedPageId.startsWith("settings-");
  setSidebarMode(isSettingsPage ? "settings" : "app");
  if (!isSettingsPage) lastAppTab = normalizedPageId;
  selectPage(normalizedPageId);
});

window.openArgos?.onAmbientHistoryChanged?.(() => {
  if (document.querySelector(".page.active")?.id === "history") {
    void loadAmbientHistory({ force: true }).then(() => {
      if (isHistorySearchActive()) void runHistorySearch(historySearchQuery, { immediate: true });
    });
  } else {
    ambientHistoryLoadedFor = null;
  }
});

window.openArgos?.onMemoriesChanged?.(() => {
  void syncLocalMemories();
});

const actionButtons = Array.from(document.querySelectorAll("[data-action]"));
const loginToggle = document.querySelector("[data-login-toggle]");
const permissionRows = Array.from(document.querySelectorAll("[data-permission]"));
const screenAwarenessRow = document.querySelector("[data-screen-awareness-row]");
const screenAwarenessToggle = document.querySelector("[data-screen-awareness-toggle]");
const memoryAddButton = document.querySelector("[data-memory-add]");
const memoryModal = document.querySelector("[data-memory-modal]");
const memoryModalTitle = document.querySelector("[data-memory-modal-title]");
const memoryModalDetail = document.querySelector("[data-memory-modal-detail]");
const memoryInput = document.querySelector("[data-memory-input]");
const memorySaveButton = document.querySelector("[data-memory-save]");
const memoryCancelButtons = Array.from(document.querySelectorAll("[data-memory-cancel]"));
const memoryResetButton = document.querySelector("[data-memory-reset]");
const memoryList = document.querySelector("[data-memory-list]");
const memoryEmpty = document.querySelector("[data-memory-empty]");
const memoryCaptureToggle = document.querySelector("[data-memory-capture-toggle]");
const memoryManagedSections = Array.from(document.querySelectorAll("[data-memory-managed]"));
const chatRenameModal = document.querySelector("[data-chat-rename-modal]");
const chatRenameForm = document.querySelector("[data-chat-rename-form]");
const chatRenameInput = document.querySelector("[data-chat-rename-input]");
const chatRenameDetail = document.querySelector("[data-chat-rename-detail]");
const chatRenameSave = document.querySelector("[data-chat-rename-save]");
const chatRenameCancel = document.querySelector("[data-chat-rename-cancel]");
const chatDeleteModal = document.querySelector("[data-chat-delete-modal]");
const chatDeleteForm = document.querySelector("[data-chat-delete-form]");
const chatDeleteDetail = document.querySelector("[data-chat-delete-detail]");
const chatDeleteConfirm = document.querySelector("[data-chat-delete-confirm]");
const chatDeleteCancel = document.querySelector("[data-chat-delete-cancel]");
const memoriesKey = "memories";
let editingMemoryId = null;
const modelSelect = document.querySelector("[data-model-select]");
const modelTrigger = document.querySelector("[data-model-trigger]");
const modelMenu = document.querySelector("[data-model-menu]");
const modelLabel = document.querySelector("[data-model-label]");
const selectedLogo = document.querySelector("[data-selected-logo]");
const voiceModelSelect = document.querySelector("[data-voice-model-select]");
const voiceModelTrigger = document.querySelector("[data-voice-model-trigger]");
const voiceModelMenu = document.querySelector("[data-voice-model-menu]");
const voiceModelLabel = document.querySelector("[data-voice-model-label]");
const voiceSelectedLogo = document.querySelector("[data-voice-selected-logo]");
const voiceModelEmptyOption = document.querySelector("[data-voice-model-empty]");
const voiceModelStatus = document.querySelector("[data-voice-model-status]");
const voiceModelControl = document.querySelector("[data-voice-model-control]");
const voiceModelRow = document.querySelector("[data-voice-model-row]");
const voiceModelTooltip = document.querySelector("[data-voice-model-tooltip]");
const openaiLogoMarkup = selectedLogo?.innerHTML || "";
const sharedModelCatalog = window.OpenArgosModelCatalog || { providers: {}, models: {}, defaultModelByProvider: {}, modelAliases: {}, providerOrder: ["openai", "anthropic", "openrouter", "gemini", "xai"] };
const modelCatalog = sharedModelCatalog.models || {};
const modelAliases = sharedModelCatalog.modelAliases || {};
const providerConfig = sharedModelCatalog.providers || {};
const providerOrder = sharedModelCatalog.providerOrder || ["openai", "anthropic", "openrouter", "gemini", "xai"];
const keyProviderOrder = sharedModelCatalog.externalModelKeyProviders || [...providerOrder, "groq"];
let modelOptions = Array.from(document.querySelectorAll("[data-model-option]"));
const modelEmptyOption = document.querySelector("[data-model-empty]");
const modelPolicyNote = document.querySelector("[data-model-policy-note]");
const modelAdminPanel = document.querySelector("[data-model-admin-panel]");
const modelDetailCopy = document.querySelector("[data-model-detail-copy]");
const modelStatus = document.querySelector("[data-model-status]");
const primaryModelKey = "primaryModel";
const modelKeyProviderKey = "modelKeyProvider";
const byokProviders = keyProviderOrder;
const llmKeyProviders = providerOrder;
const byokRows = Array.from(document.querySelectorAll("[data-byok-provider]"));
const byokInputs = Array.from(document.querySelectorAll("[data-byok-key]"));
const byokStatuses = Array.from(document.querySelectorAll("[data-byok-status]"));
const byokRemoveButtons = Array.from(document.querySelectorAll("[data-byok-remove]"));
const byokSection = document.querySelector("[data-byok-section]");
const voiceProviderOrder = ["openai", "groq"];
let voiceModelOptions = Array.from(document.querySelectorAll("[data-voice-model-option]"));
const byokSaveTimers = new Map();
let byokState = {
  activeProvider: "openai",
  keys: {}
};
let voiceTranscriptionState = {
  provider: "",
  enabled: false,
  hasOpenAIKey: false,
  hasGroqKey: false,
  models: {}
};
let modelKeysLoaded = false;
let localModelState = {
  source: "local",
  provider: "",
  model: "",
  providerKeys: {},
  canManage: true
};
let computerUseSettingsState = {
  backend: "cua",
  cuaApiKey: { hasKey: false, lastFour: null }
};
let cuaKeySaveTimer = 0;
const accountRow = document.querySelector(".account-row");
const accountAvatar = document.querySelector("[data-account-avatar]");
const accountName = document.querySelector("[data-account-name]");
const accountDetail = document.querySelector("[data-account-detail]");
const accountToggle = document.querySelector("[data-account-toggle]");
const profileModal = document.querySelector("[data-profile-modal]");
const profileForm = document.querySelector("[data-profile-form]");
const profileName = document.querySelector("[data-profile-name]");
const profileAvatarPreview = document.querySelector("[data-profile-avatar-preview]");
const profileAvatarButton = document.querySelector("[data-profile-avatar-button]");
const profileAvatarInput = document.querySelector("[data-profile-avatar-input]");
const profileError = document.querySelector("[data-profile-error]");
const profileSave = document.querySelector("[data-profile-save]");
const profileCancelButtons = Array.from(document.querySelectorAll("[data-profile-cancel]"));
const historyPanel = document.querySelector("[data-history-panel]");
const historyList = document.querySelector("[data-history-list]");
const historyEmpty = document.querySelector("[data-history-empty]");
const historyLoadMore = document.querySelector("[data-history-load-more]");
const historyViewMoreButton = document.querySelector("[data-history-view-more]");
const historySearchInput = document.querySelector("[data-history-search-input]");
const historySearchClear = document.querySelector("[data-history-search-clear]");
const menuBarToggle = document.querySelector("[data-menu-bar-toggle]");
const computerUseRow = document.querySelector("[data-computer-use-row]");
const computerUseControl = document.querySelector("[data-computer-use-control]");
const computerUseSwitch = document.querySelector("[data-computer-use-switch]");
const computerUseTooltip = document.querySelector("[data-computer-use-tooltip]");
const computerUseToggle = document.querySelector("[data-computer-use-toggle]");
const computerUseEngineRow = document.querySelector("[data-computer-use-engine-row]");
const computerUseEngineTrigger = document.querySelector("[data-computer-use-engine-trigger]");
const computerUseEngineMenu = document.querySelector("[data-computer-use-engine-menu]");
const computerUseEngineLabel = document.querySelector("[data-computer-use-engine-label]");
const computerUseEngineOptions = Array.from(document.querySelectorAll("[data-computer-use-engine-option]"));
const cuaKeyInput = document.querySelector("[data-cua-key-input]");
const cuaKeyRemove = document.querySelector("[data-cua-key-remove]");
const cuaKeyStatus = document.querySelector("[data-cua-key-status]");
const ambientSoundToggle = document.querySelector("[data-ambient-sound-toggle]");
const ambientSoundTypeRow = document.querySelector("[data-ambient-sound-type-row]");
const ambientSoundTypeSelect = document.querySelector("[data-ambient-sound-type-select]");
const ambientSoundTypeTrigger = document.querySelector("[data-ambient-sound-type-trigger]");
const ambientSoundTypeMenu = document.querySelector("[data-ambient-sound-type-menu]");
const ambientSoundTypeLabel = document.querySelector("[data-ambient-sound-type-label]");
const ambientSoundTypeOptions = Array.from(document.querySelectorAll("[data-ambient-sound-type-option]"));
const muteMusicWhileDictatingToggle = document.querySelector("[data-mute-music-while-dictating-toggle]");
const shortcutRecorders = Array.from(document.querySelectorAll("[data-shortcut-recorder]"));
const shortcutResetButtons = Array.from(document.querySelectorAll("[data-shortcut-reset]"));
const shortcutMenuLabels = Array.from(document.querySelectorAll("[data-shortcut-menu-label]"));
const shortcutStatus = document.querySelector("[data-shortcut-status]");
const menuBarKey = "openargos.device.showMenuBar";
const ambientSoundKey = "ambientSoundEnabled";
const ambientSoundTypeKey = "ambientSoundType";
const muteMusicWhileDictatingKey = "muteMusicWhileDictating";
const screenAwarenessKey = "screenAwarenessEnabled";
const computerUseKey = "computerUseEnabled";
const computerUseBackendKey = "computerUseBackend";
const memoryCaptureKey = "memoryCaptureEnabled";
const shortcutSettingsKey = "shortcuts";
const defaultShortcutSettings = {
  newChat: "Control+A",
  voiceRecording: "Alt+M"
};
const themeOptions = Array.from(document.querySelectorAll("[data-theme-option]"));
const themeKey = "theme";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: light)");
const obsoleteSharedStorageKeys = [
  "openargos.memories",
  "openargos.primaryModel",
  "openargos.theme",
  "openargos.showMenuBar"
];
let profileAvatarDraft = null;
let ambientHistoryRows = [];
let ambientHistoryLoadedFor = null;
let ambientHistoryCursor = null;
let ambientHistoryHasMore = false;
let ambientHistoryLoadingMore = false;
let historySearchRows = [];
let historySearchQuery = "";
let historySearchError = "";
let historySearchLoading = false;
let historySearchRequestId = 0;
let historySearchTimer = 0;
let ambientHistoryVisibleCount = 60;
const ambientHistoryPageSize = 60;
const ambientHistoryFetchPageSize = 80;

function storagePart(value) {
  return encodeURIComponent(String(value || "none"));
}

function getUserStorageScope(session = currentLocalSession) {
  const userId = session?.user?.id;
  return storagePart(userId || "local-user");
}

function scopedStorageKey(key) {
  return `openargos.${getUserStorageScope()}.${key}`;
}

function getScopedStorageItem(key) {
  return window.localStorage.getItem(scopedStorageKey(key));
}

function setScopedStorageItem(key, value) {
  window.localStorage.setItem(scopedStorageKey(key), value);
}

function shortcutSymbolLabel(accelerator = "") {
  const symbols = {
    Command: "⌘",
    Control: "⌃",
    Alt: "⌥",
    Shift: "⇧",
    Super: "◆",
    CommandOrControl: navigator.platform?.toLowerCase().includes("mac") ? "⌘" : "Ctrl"
  };
  return String(accelerator || "")
    .split("+")
    .filter(Boolean)
    .map((part) => symbols[part] || (part === "Space" ? "Space" : part))
    .join("");
}

function normalizeShortcutAccelerator(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (!raw) return "";
  const aliases = {
    cmd: "Command",
    command: "Command",
    meta: "Command",
    ctrl: "Control",
    control: "Control",
    alt: "Alt",
    option: "Alt",
    opt: "Alt",
    shift: "Shift",
    super: "Super",
    commandorcontrol: "CommandOrControl",
    cmdorctrl: "CommandOrControl"
  };
  const parts = raw.split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return fallback || "";
  const key = parts.at(-1);
  const modifiers = [];
  parts.slice(0, -1).forEach((part) => {
    const normalized = aliases[part.toLowerCase().replace(/\s+/g, "")] || part;
    if (["Command", "Control", "Alt", "Shift", "Super", "CommandOrControl"].includes(normalized) && !modifiers.includes(normalized)) {
      modifiers.push(normalized);
    }
  });
  if (!modifiers.length || !key) return fallback || "";
  const keyAliases = {
    space: "Space",
    esc: "Escape",
    escape: "Escape",
    return: "Enter",
    enter: "Enter",
    period: ".",
    comma: ",",
    plus: "Plus",
    minus: "-",
    tab: "Tab",
    backspace: "Backspace",
    delete: "Delete"
  };
  const normalizedKey = keyAliases[String(key).toLowerCase()] || (key.length === 1 ? key.toUpperCase() : key);
  return [...modifiers, normalizedKey].join("+");
}

function normalizeShortcutSettings(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    newChat: normalizeShortcutAccelerator(source.newChat, defaultShortcutSettings.newChat),
    voiceRecording: normalizeShortcutAccelerator(source.voiceRecording, defaultShortcutSettings.voiceRecording)
  };
}

function readShortcutSettings() {
  try {
    return normalizeShortcutSettings(JSON.parse(getScopedStorageItem(shortcutSettingsKey) || "{}"));
  } catch {
    return { ...defaultShortcutSettings };
  }
}

function writeShortcutSettings(shortcuts = {}) {
  const normalized = normalizeShortcutSettings(shortcuts);
  setScopedStorageItem(shortcutSettingsKey, JSON.stringify(normalized));
  return normalized;
}

function renderShortcutSettings(shortcuts = readShortcutSettings(), { status = "", error = false } = {}) {
  const normalized = normalizeShortcutSettings(shortcuts);
  shortcutRecorders.forEach((button) => {
    const action = button.dataset.shortcutRecorder;
    const label = shortcutSymbolLabel(normalized[action]);
    button.querySelector("[data-shortcut-label]")?.replaceChildren(document.createTextNode(label || "Unassigned"));
    button.setAttribute("title", `Change shortcut: ${label || "Unassigned"}`);
    button.classList.toggle("is-recording", recordingShortcutAction === action);
  });
  shortcutMenuLabels.forEach((item) => {
    const action = item.dataset.shortcutMenuLabel;
    item.textContent = shortcutSymbolLabel(normalized[action]);
  });
  if (shortcutStatus) {
    shortcutStatus.textContent = status;
    shortcutStatus.classList.toggle("is-error", Boolean(error));
  }
}

function shortcutFromKeyboardEvent(event) {
  const modifiers = [];
  if (event.metaKey) modifiers.push("Command");
  if (event.ctrlKey) modifiers.push("Control");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  const rawKey = String(event.key || "");
  const code = String(event.code || "");
  if (["Meta", "Control", "Alt", "Shift"].includes(rawKey)) return "";
  let key = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey;
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  if (/^Digit\d$/.test(code)) key = code.slice(5);
  if (code === "Space") key = "Space";
  if (code === "Period") key = ".";
  if (code === "Comma") key = ",";
  if (code === "Minus") key = "-";
  if (code === "Equal") key = "Plus";
  if (!modifiers.length || !key) return "";
  return [...modifiers, key].join("+");
}

function duplicateShortcutAction(shortcuts = {}, action = "") {
  const current = normalizeShortcutSettings(shortcuts);
  const value = String(current[action] || "").toLowerCase();
  if (!value) return "";
  return Object.entries(current).find(([key, shortcut]) => key !== action && String(shortcut || "").toLowerCase() === value)?.[0] || "";
}

async function saveShortcutSettings(shortcuts = {}, { syncLocal = true, status = "Shortcut updated." } = {}) {
  const normalized = writeShortcutSettings(shortcuts);
  renderShortcutSettings(normalized, { status });
  try {
    const result = await window.openArgos?.updateShortcuts?.(normalized);
    if (result?.shortcuts) {
      writeShortcutSettings(result.shortcuts);
      renderShortcutSettings(result.shortcuts, { status });
    }
  } catch {
    renderShortcutSettings(normalized, { status: "Saved locally. It will apply here, but the global shortcut could not be refreshed.", error: true });
  }
  if (syncLocal) window.openArgos?.upsertUserSettings?.({ shortcuts: normalized });
}

let recordingShortcutAction = "";

function clearObsoleteSharedStorage() {
  obsoleteSharedStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

const permissionCopy = {
  granted: "Configured",
  denied: "Configure",
  restricted: "Configure",
  unknown: "Configure",
  default: "Configure",
  "not-determined": "Configure",
  "not-granted": "Configure",
  "open-settings": "Configure",
  "restart-required": "Restart app",
  checking: "Configure"
};

function resolveTheme(choice) {
  if (choice === "system") return systemThemeQuery.matches ? "light" : "dark";
  return choice === "light" ? "light" : "dark";
}

function normalizeThemeChoice(choice) {
  return ["dark", "light", "system"].includes(choice) ? choice : "dark";
}

function applyTheme(choice, { sync = true } = {}) {
  const themeChoice = normalizeThemeChoice(choice || getScopedStorageItem(themeKey) || "dark");
  const resolved = resolveTheme(themeChoice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = themeChoice;
  themeOptions.forEach((option) => {
    option.classList.toggle("active", option.dataset.themeOption === themeChoice);
  });
  if (sync) window.openArgos?.setTheme?.(themeChoice);
}

themeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const choice = normalizeThemeChoice(option.dataset.themeOption || "dark");
    setScopedStorageItem(themeKey, choice);
    applyTheme(choice);
    window.openArgos?.upsertUserSettings?.({ theme: choice });
  });
});

systemThemeQuery.addEventListener?.("change", () => {
  if ((getScopedStorageItem(themeKey) || "dark") === "system") applyTheme("system");
});

window.openArgos?.onThemeChange?.((theme) => {
  if (!theme?.choice) return;
  setScopedStorageItem(themeKey, theme.choice);
  applyTheme(theme.choice, { sync: false });
});

async function initializeTheme() {
  clearObsoleteSharedStorage();
  const localChoice = getScopedStorageItem(themeKey);
  if (localChoice) {
    applyTheme(localChoice);
    return;
  }

  try {
    const theme = await window.openArgos?.getTheme?.();
    applyTheme(theme?.choice || "dark", { sync: false });
  } catch {
    applyTheme("dark", { sync: false });
  }
}

initializeTheme();

function providerLabel(provider) {
  return providerConfig[provider]?.label || {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    groq: "Groq",
    xai: "xAI",
    openrouter: "OpenRouter"
  }[provider] || "OpenAI";
}

function normalizeByokProvider(provider) {
  return llmKeyProviders.includes(provider) ? provider : "";
}

function normalizeVoiceTranscriptionProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  return ["openai", "groq"].includes(value) ? value : "";
}

function normalizeModelId(model) {
  const id = String(model || "").trim();
  return modelCatalog[id] ? id : modelAliases[id] || "";
}

function getModelOption(model) {
  const modelId = normalizeModelId(model);
  return modelOptions.find((item) => item.dataset.modelOption === modelId) || null;
}

function getExactModelOption(model) {
  const modelId = normalizeModelId(model);
  return modelOptions.find((item) => item.dataset.modelOption === modelId) || null;
}

function providerForModel(model) {
  return getModelOption(model)?.dataset.provider || "";
}

function defaultModelForProvider(provider) {
  if (!provider) return "";
  const configured = sharedModelCatalog.defaultModelByProvider?.[provider];
  if (configured && getExactModelOption(configured)) return configured;
  return modelOptions.find((item) => item.dataset.provider === provider)?.dataset.modelOption || "";
}

function modelProvider(model) {
  return getExactModelOption(model)?.dataset.provider || "";
}

function normalizeLocalModelPolicy(policy = {}) {
  const option = getModelOption(policy.model);
  const model = option?.dataset.modelOption || "";
  const provider = option?.dataset.provider || "";
  return {
    source: "local",
    provider,
    model
  };
}

function validateModelApiKey(provider, value) {
  const key = String(value || "").trim();
  if (!key) return { ok: true, key: "" };
  if (/\s/.test(key)) {
    return {
      ok: false,
      message: "API keys cannot include spaces."
    };
  }

  const rules = {
    openai: {
      test: (candidate) => candidate.startsWith("sk-") && candidate.length >= 30,
      message: "OpenAI keys should start with sk-."
    },
    anthropic: {
      test: (candidate) => candidate.startsWith("sk-ant-") && candidate.length >= 30,
      message: "Anthropic keys should start with sk-ant-."
    },
    gemini: {
      test: (candidate) => /^[A-Za-z0-9._-]{24,}$/.test(candidate),
      message: "Enter a valid Gemini API key."
    },
    groq: {
      test: (candidate) => candidate.startsWith("gsk_") && candidate.length >= 30,
      message: "Groq keys should start with gsk_."
    },
    xai: {
      test: (candidate) => candidate.startsWith("xai-") && candidate.length >= 24,
      message: "xAI keys usually start with xai-."
    },
    openrouter: {
      test: (candidate) => candidate.startsWith("sk-or-") && candidate.length >= 30,
      message: "OpenRouter keys usually start with sk-or-."
    }
  };
  const rule = rules[provider];
  if (!rule?.test(key)) {
    return {
      ok: false,
      message: rule?.message || "That key format does not look right."
    };
  }

  return { ok: true, key };
}

function getProviderStatus(provider) {
  return byokStatuses.find((item) => item.dataset.byokStatus === provider);
}

function getProviderInput(provider) {
  return byokInputs.find((item) => item.dataset.byokKey === provider);
}

function providerHasSavedKey(provider) {
  const localRecord = byokState.keys?.[provider] || {};
  if (localRecord.removed) return false;
  return Boolean(localRecord.hasKey);
}

function providerKeySummary(provider) {
  const localKey = byokState.keys?.[provider] || {};
  if (localKey.removed) {
    return {
      hasKey: false,
      removed: true,
      lastFour: null,
      updatedAt: localKey.updatedAt || null,
      storage: localKey.storage || "local_keychain"
    };
  }
  return {
    hasKey: Boolean(localKey.hasKey),
    removed: false,
    lastFour: localKey.lastFour || null,
    updatedAt: localKey.updatedAt || null,
    storage: localKey.storage || "local_keychain"
  };
}

function voiceTranscriptionProviderHasKey(provider, state = voiceTranscriptionState) {
  if (provider === "openai") return Boolean(state.hasOpenAIKey || providerHasSavedKey("openai"));
  if (provider === "groq") return Boolean(state.hasGroqKey || providerHasSavedKey("groq"));
  return false;
}

function hasSavedVoiceKey(state = voiceTranscriptionState) {
  return voiceProviderOrder.some((provider) => voiceTranscriptionProviderHasKey(provider, state));
}

function voiceTranscriptionModelId(provider) {
  return voiceTranscriptionState.models?.[provider] || (provider === "openai" ? "gpt-4o-transcribe" : provider === "groq" ? "whisper-large-v3-turbo" : "");
}

function voiceTranscriptionModelLabel(provider) {
  const model = voiceTranscriptionModelId(provider);
  if (model === "gpt-4o-transcribe") return "GPT-4o Transcribe";
  if (model === "whisper-large-v3-turbo") return "Whisper Large v3 Turbo";
  return model;
}

function voiceTranscriptionOptionLabel(provider) {
  const model = voiceTranscriptionModelLabel(provider);
  return [providerLabel(provider), model].filter(Boolean).join(" ");
}

function getVoiceModelOption(provider) {
  return voiceModelOptions.find((item) => item.dataset.voiceProvider === provider) || null;
}

function renderVoiceModelStatus(text = "", className = "", icon = "") {
  if (!voiceModelStatus) return;
  if (!text) {
    voiceModelStatus.hidden = true;
    voiceModelStatus.textContent = "";
    voiceModelStatus.className = "byok-status model-selection-status";
    return;
  }
  voiceModelStatus.hidden = false;
  setByokStatus(voiceModelStatus, text, className, icon);
  voiceModelStatus.classList.add("model-selection-status");
}

function buildVoiceModelOptions() {
  if (!voiceModelMenu || !voiceModelEmptyOption) return;
  voiceModelMenu.querySelectorAll("[data-voice-model-option]").forEach((option) => option.remove());
  voiceProviderOrder.forEach((provider) => {
    const option = document.createElement("button");
    option.className = "model-option";
    option.type = "button";
    option.dataset.voiceModelOption = voiceTranscriptionModelId(provider);
    option.dataset.voiceProvider = provider;
    option.innerHTML = `
      <span class="provider-logo ${provider}-logo" aria-hidden="true">${providerLogoMarkup(provider)}</span>
      <span><span class="model-name"></span></span>
      <span class="model-option-check" aria-hidden="true">${lucideIcon("check")}</span>
    `;
    option.querySelector(".model-name").textContent = voiceTranscriptionOptionLabel(provider);
    option.addEventListener("click", () => {
      if (voiceModelTrigger?.disabled) return;
      if (option.hidden || option.disabled) return;
      void setVoiceTranscriptionProvider(provider);
      closeVoiceModelMenu();
    });
    voiceModelMenu.append(option);
  });
  voiceModelOptions = Array.from(voiceModelMenu.querySelectorAll("[data-voice-model-option]"));
}

function renderVoiceTranscriptionState() {
  let provider = normalizeVoiceTranscriptionProvider(voiceTranscriptionState.provider);
  const nextState = {
    ...voiceTranscriptionState,
    hasOpenAIKey: Boolean(voiceTranscriptionState.hasOpenAIKey || providerHasSavedKey("openai")),
    hasGroqKey: Boolean(voiceTranscriptionState.hasGroqKey || providerHasSavedKey("groq"))
  };
  if (provider && !voiceTranscriptionProviderHasKey(provider, nextState)) {
    provider = voiceProviderOrder.find((candidate) => voiceTranscriptionProviderHasKey(candidate, nextState)) || provider;
  }
  nextState.provider = provider;
  nextState.enabled = Boolean(provider && voiceTranscriptionProviderHasKey(provider, nextState));
  voiceTranscriptionState = nextState;

  buildVoiceModelOptions();
  let visibleCount = 0;
  voiceModelOptions.forEach((option) => {
    const optionProvider = normalizeVoiceTranscriptionProvider(option.dataset.voiceProvider);
    const selectable = voiceTranscriptionProviderHasKey(optionProvider);
    option.hidden = !selectable;
    option.disabled = !selectable;
    option.classList.toggle("active", voiceTranscriptionState.enabled && optionProvider === provider);
    option.dataset.voiceModelOption = voiceTranscriptionModelId(optionProvider);
    const name = option.querySelector(".model-name");
    if (name) name.textContent = voiceTranscriptionOptionLabel(optionProvider);
    if (selectable) visibleCount += 1;
  });
  if (voiceModelEmptyOption) {
    voiceModelEmptyOption.hidden = visibleCount > 0;
  }

  const loadingVoiceKeys = !modelKeysLoaded;
  const missingVoiceKeys = modelKeysLoaded && !hasSavedVoiceKey(voiceTranscriptionState);
  const voiceModelDisabled = loadingVoiceKeys || missingVoiceKeys;
  const selectedOption = getVoiceModelOption(provider);
  const selectable = selectedOption && !selectedOption.disabled && !selectedOption.hidden;
  if (selectable) {
    if (voiceModelLabel) voiceModelLabel.textContent = voiceTranscriptionOptionLabel(provider);
    const logo = selectedOption.querySelector(".provider-logo");
    if (voiceSelectedLogo && logo) {
      voiceSelectedLogo.className = logo.className;
      voiceSelectedLogo.innerHTML = logo.innerHTML;
    }
  } else {
    if (voiceModelLabel) voiceModelLabel.textContent = modelKeysLoaded ? "Select voice model" : "Loading voice models";
    if (voiceSelectedLogo) {
      voiceSelectedLogo.className = "provider-logo model-placeholder-logo";
      voiceSelectedLogo.innerHTML = "";
    }
  }

  if (voiceModelTrigger) {
    voiceModelTrigger.disabled = voiceModelDisabled;
    voiceModelTrigger.title = loadingVoiceKeys
      ? "Checking saved voice provider keys"
      : missingVoiceKeys
        ? "Add an OpenAI or Groq key below to enable voice transcription"
        : "";
    voiceModelTrigger.classList.toggle("model-select-button-disabled", voiceModelDisabled);
  }
  voiceModelControl?.classList.toggle("has-tooltip", voiceModelDisabled);
  voiceModelRow?.classList.toggle("setting-row-disabled", voiceModelDisabled);
  if (voiceModelTooltip) {
    const title = voiceModelTooltip.querySelector(".row-tooltip-title");
    const body = voiceModelTooltip.querySelector(".row-tooltip-body");
    if (title) title.textContent = loadingVoiceKeys ? "Loading voice keys" : missingVoiceKeys ? "Add a voice key" : "Voice transcription";
    if (body) body.textContent = loadingVoiceKeys
      ? "Checking saved provider keys before enabling voice transcription."
      : missingVoiceKeys
        ? "Add an OpenAI or Groq key below to enable voice transcription."
        : "Choose the voice transcription model route.";
  }
  renderVoiceModelStatus(
    missingVoiceKeys ? "Add an OpenAI or Groq key below to choose a voice model" : "",
    "warning",
    "triangleAlert"
  );
}

async function loadVoiceTranscriptionState() {
  try {
    const result = await window.openArgos?.getVoiceTranscriptionSettings?.();
    if (result?.ok) {
      voiceTranscriptionState = {
        provider: normalizeVoiceTranscriptionProvider(result.provider),
        enabled: Boolean(result.enabled),
        hasOpenAIKey: Boolean(result.hasOpenAIKey),
        hasGroqKey: Boolean(result.hasGroqKey),
        models: result.models || voiceTranscriptionState.models || {}
      };
    }
  } catch {
    // Keep the local fallback state.
  }
  renderModelKeyState();
}

function canManageModels() {
  return true;
}

function savedByokProviders() {
  return llmKeyProviders.filter((provider) => providerHasSavedKey(provider));
}

function hasSavedLlmKey() {
  return savedByokProviders().length > 0;
}

function selectedModelSupportsComputerUse() {
  const modelId = normalizeModelId(localModelState.model);
  return Boolean(modelId && modelCatalog[modelId]?.computerUse);
}

function computerUseUnavailableReason() {
  if (!modelKeysLoaded) {
    return {
      title: "Loading models",
      body: "Model keys are still loading"
    };
  }
  if (!hasSavedLlmKey()) {
    return {
      title: "Add a key",
      body: "Add an LLM key in Settings > Models"
    };
  }
  const modelId = normalizeModelId(localModelState.model);
  if (!modelId) {
    return {
      title: "Select a model",
      body: "Choose a Computer Use-capable model in Settings > Models"
    };
  }
  const model = modelCatalog[modelId] || {};
  if (!selectedModelSupportsComputerUse()) {
    return {
      title: "Select a model",
      body: "Choose a Computer Use-capable model in Settings > Models"
    };
  }
  if (!providerHasSavedKey(model.provider)) {
    return {
      title: "Add a key",
      body: `Add a ${providerLabel(model.provider)} key in Settings > Models`
    };
  }
  return null;
}

function renderComputerUseAvailability() {
  if (!computerUseToggle) return;
  const reason = computerUseUnavailableReason();
  const disabled = Boolean(reason);
  computerUseToggle.disabled = disabled;
  computerUseToggle.setAttribute("aria-disabled", disabled ? "true" : "false");
  computerUseToggle.title = disabled && reason ? `${reason.title}. ${reason.body}` : "";
  computerUseControl?.classList.toggle("has-tooltip", disabled);
  computerUseRow?.classList.toggle("setting-row-disabled", disabled);
  computerUseSwitch?.classList.toggle("switch-disabled", disabled);
  if (computerUseTooltip && reason) {
    const title = computerUseTooltip.querySelector(".row-tooltip-title");
    const body = computerUseTooltip.querySelector(".row-tooltip-body");
    if (title) title.textContent = reason.title;
    if (body) body.textContent = reason.body;
  }
  if (disabled && modelKeysLoaded && computerUseToggle.checked) {
    computerUseToggle.checked = false;
    setScopedStorageItem(computerUseKey, "false");
    window.openArgos?.upsertUserSettings?.({ computerUseEnabled: false });
  }
  renderComputerUseEngineVisibility();
}

function renderComputerUseEngineVisibility() {
  const shouldShow = Boolean(computerUseToggle?.checked && !computerUseToggle.disabled);
  if (computerUseEngineRow) computerUseEngineRow.hidden = !shouldShow;
  if (!shouldShow) closeComputerUseEngineMenu();
}

function normalizeComputerUseBackend(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized === "built_in" ? "built_in" : "cua";
}

function computerUseBackendLabel(backend) {
  return normalizeComputerUseBackend(backend) === "built_in" ? "Native fallback" : "Cua";
}

function renderComputerUseBackend() {
  const backend = normalizeComputerUseBackend(computerUseSettingsState.backend || getScopedStorageItem(computerUseBackendKey));
  computerUseSettingsState.backend = backend;
  if (computerUseEngineLabel) computerUseEngineLabel.textContent = computerUseBackendLabel(backend);
  computerUseEngineOptions.forEach((option) => {
    option.classList.toggle("active", normalizeComputerUseBackend(option.dataset.computerUseEngineOption) === backend);
  });
}

function renderCuaKeyState() {
  const keyState = computerUseSettingsState.cuaApiKey || {};
  if (cuaKeyInput && !cuaKeyInput.dataset.dirty) {
    cuaKeyInput.placeholder = keyState.hasKey
      ? (keyState.lastFour ? `Saved key ending in ${keyState.lastFour}` : "Saved Cua key")
      : "Cua API key";
  }
  if (cuaKeyRemove) {
    cuaKeyRemove.hidden = !keyState.hasKey;
    cuaKeyRemove.disabled = !keyState.hasKey;
  }
  if (cuaKeyStatus && !cuaKeyInput?.dataset.dirty) {
    setByokStatus(cuaKeyStatus, keyState.hasKey ? "Saved" : "Not saved", keyState.hasKey ? "saved" : "", keyState.hasKey ? "check" : "");
  }
}

async function loadComputerUseSettings() {
  try {
    const result = await window.openArgos?.getComputerUseSettings?.();
    if (result?.ok) {
      computerUseSettingsState = {
        backend: normalizeComputerUseBackend(result.backend),
        cuaApiKey: result.cuaApiKey || { hasKey: false, lastFour: null }
      };
      setScopedStorageItem(computerUseBackendKey, computerUseSettingsState.backend);
    }
  } catch {
    computerUseSettingsState = {
      ...computerUseSettingsState,
      backend: normalizeComputerUseBackend(getScopedStorageItem(computerUseBackendKey))
    };
  }
  renderComputerUseBackend();
  renderCuaKeyState();
}

async function setComputerUseBackend(backend) {
  const nextBackend = normalizeComputerUseBackend(backend);
  computerUseSettingsState = {
    ...computerUseSettingsState,
    backend: nextBackend
  };
  setScopedStorageItem(computerUseBackendKey, nextBackend);
  renderComputerUseBackend();
  try {
    const result = await window.openArgos?.setComputerUseBackend?.(nextBackend);
    if (result?.ok) {
      computerUseSettingsState = {
        ...computerUseSettingsState,
        backend: normalizeComputerUseBackend(result.backend),
        cuaApiKey: result.cuaApiKey || computerUseSettingsState.cuaApiKey
      };
      setScopedStorageItem(computerUseBackendKey, computerUseSettingsState.backend);
      renderComputerUseBackend();
      renderCuaKeyState();
    }
  } catch {
    // Local scoped state remains the offline fallback.
  }
}

function validateCuaKey(value = "") {
  const key = String(value || "").trim();
  if (!key) return { ok: true, key: "" };
  if (key.length < 12) return { ok: false, message: "Enter a valid Cua API key." };
  return { ok: true, key };
}

async function saveCuaKey() {
  if (!cuaKeyInput || !cuaKeyInput.dataset.dirty) return;
  const validation = validateCuaKey(cuaKeyInput.value);
  if (!validation.ok) {
    setByokStatus(cuaKeyStatus, validation.message, "warning", "triangleAlert");
    return;
  }
  try {
    const result = await window.openArgos?.saveCuaKey?.(validation.key);
    if (!result?.ok) throw new Error(result?.message || "Could not save Cua key.");
    computerUseSettingsState = {
      ...computerUseSettingsState,
      backend: normalizeComputerUseBackend(result.backend || computerUseSettingsState.backend),
      cuaApiKey: result.cuaApiKey || { hasKey: false, lastFour: null }
    };
    cuaKeyInput.value = "";
    delete cuaKeyInput.dataset.dirty;
    renderComputerUseBackend();
    renderCuaKeyState();
  } catch (error) {
    setByokStatus(cuaKeyStatus, error?.message || "Could not save Cua key.", "warning", "triangleAlert");
  }
}

function scheduleCuaKeySave() {
  if (!cuaKeyInput) return;
  cuaKeyInput.dataset.dirty = "true";
  setByokStatus(cuaKeyStatus, "Saving...");
  window.clearTimeout(cuaKeySaveTimer);
  cuaKeySaveTimer = window.setTimeout(saveCuaKey, 650);
}

function positionNewChatDisabledTooltip() {
  if (!newChatControl || !newChatDisabledTooltip) return;
  const rect = newChatControl.getBoundingClientRect();
  const gap = 8;
  const margin = 10;
  const tooltipWidth = newChatDisabledTooltip.offsetWidth || 260;
  const left = Math.min(rect.right + gap, window.innerWidth - tooltipWidth - margin);
  const top = Math.min(Math.max(rect.top + rect.height / 2, margin), window.innerHeight - margin);
  newChatDisabledTooltip.style.left = `${Math.max(margin, left)}px`;
  newChatDisabledTooltip.style.top = `${top}px`;
}

function showNewChatDisabledTooltip() {
  if (!newChatControl?.classList.contains("is-disabled") || !newChatDisabledTooltip) return;
  positionNewChatDisabledTooltip();
  newChatDisabledTooltip.classList.add("is-visible");
}

function hideNewChatDisabledTooltip() {
  newChatDisabledTooltip?.classList.remove("is-visible");
}

function renderNewChatAvailability() {
  if (!newMenuTrigger) return;
  const disabled = !modelKeysLoaded || !hasSavedLlmKey();
  const tooltipTitle = !modelKeysLoaded ? "Loading model keys" : "Add an LLM key";
  const tooltipBody = !modelKeysLoaded
    ? "Checking saved provider keys before starting a chat."
    : "Save a provider key in Settings > Models to start a chat.";
  newMenuTrigger.disabled = disabled;
  newMenuTrigger.setAttribute("aria-disabled", disabled ? "true" : "false");
  newMenuTrigger.setAttribute("aria-label", !modelKeysLoaded
    ? "New chat unavailable. Loading model keys"
    : disabled
      ? "New chat unavailable. Add an LLM key in Settings > Models"
      : "New chat");
  if (newChatTooltipTitle) newChatTooltipTitle.textContent = tooltipTitle;
  if (newChatTooltipBody) newChatTooltipBody.textContent = tooltipBody;
  if (newChatControl) {
    newChatControl.classList.toggle("is-disabled", disabled);
  }
  if (disabled) {
    closeNewMenu();
  } else {
    hideNewChatDisabledTooltip();
  }
}

function providerLogoMarkup(provider) {
  if (provider === "openai") return openaiLogoMarkup;
  if (provider === "gemini") return '<img src="./assets/gemini-color.svg" alt="" />';
  if (provider === "openrouter") return '<img src="./assets/openrouter.png" alt="" />';
  if (provider === "xai") return '<img src="./assets/xai.png" alt="" />';
  if (provider === "anthropic") return '<img src="./assets/claude-ai-symbol.svg" alt="" />';
  if (provider === "groq") return '<img src="./assets/groq.png" alt="" />';
  return "";
}

function renderModelStatus(text = "", className = "", icon = "") {
  if (!modelStatus) return;
  if (!text) {
    modelStatus.hidden = true;
    modelStatus.textContent = "";
    modelStatus.className = "byok-status model-selection-status";
    return;
  }
  modelStatus.hidden = false;
  setByokStatus(modelStatus, text, className, icon);
  modelStatus.classList.add("model-selection-status");
}

function buildModelOptions() {
  if (!modelMenu || !modelEmptyOption) return;
  modelMenu.querySelectorAll("[data-model-option]").forEach((option) => option.remove());
  const modelOrder = Object.keys(modelCatalog);
  const entries = Object.entries(modelCatalog).sort(([aId, a], [bId, b]) => {
    const providerDiff = providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider);
    return providerDiff || modelOrder.indexOf(aId) - modelOrder.indexOf(bId);
  });
  entries.forEach(([id, model]) => {
    const option = document.createElement("button");
    option.className = "model-option";
    option.type = "button";
    option.dataset.modelOption = id;
    option.dataset.provider = model.provider;
    option.innerHTML = `
      <span class="provider-logo ${model.provider}-logo" aria-hidden="true">${providerLogoMarkup(model.provider)}</span>
      <span><span class="model-name"></span></span>
      <span class="model-option-check" aria-hidden="true">${lucideIcon("check")}</span>
    `;
    option.querySelector(".model-name").textContent = model.label;
    option.addEventListener("click", () => {
      if (modelTrigger?.disabled) return;
      if (option.hidden || option.disabled) return;
      setPrimaryModel(option.dataset.modelOption);
      closeModelMenu();
    });
    modelMenu.append(option);
  });
  modelOptions = Array.from(modelMenu.querySelectorAll("[data-model-option]"));
}

buildModelOptions();

function availableModelOptionsForSource(source = localModelState.source) {
  return modelOptions;
}

function modelOptionIsSelectable(option) {
  if (!option) return false;
  if (!modelKeysLoaded) return true;
  const provider = option.dataset.provider || "openai";
  return llmKeyProviders.includes(provider) && providerHasSavedKey(provider);
}

function modelIsAvailableForSource(model, source = localModelState.source) {
  const option = getExactModelOption(model);
  if (!option) return false;
  return availableModelOptionsForSource(source).includes(option) && modelOptionIsSelectable(option);
}

function fallbackModelForSource(source = localModelState.source, preferredModel = localModelState.model) {
  if (modelIsAvailableForSource(preferredModel, source)) return preferredModel;
  const available = availableModelOptionsForSource(source).filter(modelOptionIsSelectable);
  return available[0]?.dataset.modelOption || "";
}

function enabledByokProvider() {
  const provider = normalizeByokProvider(byokState.activeProvider);
  if (providerHasSavedKey(provider)) return provider;
  const currentModelProvider = modelProvider(localModelState.model);
  if (currentModelProvider && providerHasSavedKey(currentModelProvider)) return currentModelProvider;
  if (providerHasSavedKey(localModelState.provider)) {
    return normalizeByokProvider(localModelState.provider);
  }
  return savedByokProviders()[0] || "";
}

function renderModelOptions() {
  const available = new Set(availableModelOptionsForSource().map((option) => option.dataset.modelOption));
  let visibleCount = 0;
  modelOptions.forEach((option) => {
    const visible = available.has(option.dataset.modelOption);
    const selectable = visible && modelOptionIsSelectable(option);
    option.hidden = !selectable;
    option.disabled = !selectable;
    option.classList.toggle("model-option-disabled", false);
    option.title = "";
    if (selectable) visibleCount += 1;
  });
  if (modelEmptyOption) {
    modelEmptyOption.hidden = true;
  }
}

function renderSelectedModel(model = localModelState.model) {
  const option = getExactModelOption(model);
  const selectable = option && modelOptionIsSelectable(option);
  if (!selectable) {
    modelOptions.forEach((item) => item.classList.remove("active"));
    if (modelLabel) modelLabel.textContent = modelKeysLoaded ? "Select model" : "Loading models";
    if (selectedLogo) {
      selectedLogo.className = "provider-logo model-placeholder-logo";
      selectedLogo.innerHTML = "";
    }
    return;
  }
  modelOptions.forEach((item) => item.classList.toggle("active", item === option));
  if (modelLabel) modelLabel.textContent = option.querySelector(".model-name")?.textContent ?? option.textContent.trim();
  const logo = option.querySelector(".provider-logo");
  if (selectedLogo && logo) {
    selectedLogo.className = logo.className;
    selectedLogo.innerHTML = logo.innerHTML;
  }
}

function renderLocalModelState() {
  const canManage = canManageModels();
  if (modelAdminPanel) modelAdminPanel.hidden = false;
  const policy = normalizeLocalModelPolicy(localModelState);
  localModelState = {
    ...localModelState,
    ...policy
  };
  const resolvedModel = fallbackModelForSource(localModelState.source, localModelState.model);
  if (resolvedModel !== localModelState.model) {
    localModelState.model = resolvedModel;
    localModelState.provider = providerForModel(resolvedModel);
  }
  renderModelOptions();
  renderSelectedModel(localModelState.model);

  const missingLlmKeys = modelKeysLoaded && !hasSavedLlmKey();
  if (modelTrigger) {
    modelTrigger.disabled = missingLlmKeys;
    modelTrigger.title = missingLlmKeys ? "Add an LLM key below to enable model selection" : "";
    modelTrigger.classList.toggle("model-select-button-disabled", missingLlmKeys);
  }
  renderModelStatus(
    missingLlmKeys ? "Add an LLM key below to choose a model" : "",
    "warning",
    "triangleAlert"
  );
  if (modelPolicyNote) {
    modelPolicyNote.hidden = false;
    modelPolicyNote.textContent = "Choose local LLM and voice transcription routes, then save provider keys on this device.";
  }
  if (modelDetailCopy) {
    modelDetailCopy.textContent = "Used for chat, screen-aware answers, and default agent tasks";
  }

  byokInputs.forEach((input) => {
    input.disabled = !canManage;
  });
  renderModelKeyState();
}

function renderModelKeyState() {
  const canManage = canManageModels();
  const activeProvider = modelProvider(localModelState.model);
  voiceTranscriptionState = {
    ...voiceTranscriptionState,
    hasOpenAIKey: providerHasSavedKey("openai"),
    hasGroqKey: providerHasSavedKey("groq")
  };
  renderVoiceTranscriptionState();
  const selectedVoiceProvider = normalizeVoiceTranscriptionProvider(voiceTranscriptionState.provider);
  const activeVoiceProvider = voiceTranscriptionProviderHasKey(selectedVoiceProvider, voiceTranscriptionState)
    ? selectedVoiceProvider
    : "";

  byokRows.forEach((row) => {
    const provider = row.dataset.byokProvider;
    const keyState = providerKeySummary(provider);
    const activeLlm = Boolean(activeProvider) && activeProvider === provider && keyState.hasKey;
    const activeVoice = Boolean(activeVoiceProvider) && activeVoiceProvider === provider && keyState.hasKey;
    const active = activeLlm || activeVoice;
    const input = getProviderInput(provider);
    const status = getProviderStatus(provider);
    const removeButton = byokRemoveButtons.find((item) => item.dataset.byokRemove === provider);

    row.classList.toggle("active", active);
    if (removeButton) {
      removeButton.hidden = !canManage || !keyState.hasKey;
      removeButton.disabled = !canManage || !keyState.hasKey;
    }

    if (input && !input.dataset.dirty) {
      input.placeholder = keyState.hasKey
        ? (keyState.lastFour ? `Saved key ending in ${keyState.lastFour}` : "Saved key")
        : `${providerLabel(provider)} API key`;
    }

    if (!status || input?.dataset.dirty) return;
    if (activeLlm && activeVoice) {
      setByokStatus(status, "Active for LLM and voice transcription", "active", "check");
    } else if (activeLlm) {
      setByokStatus(status, "Active for LLM", "active", "check");
    } else if (activeVoice) {
      setByokStatus(status, "Active for voice transcription", "active", "check");
    } else if (keyState.hasKey) {
      setByokStatus(status, "Saved", "saved", "check");
    } else {
      setByokStatus(status, "Not saved");
    }
  });
  renderNewChatAvailability();
  renderComputerUseAvailability();
}

async function loadModelKeyState() {
  try {
    const result = await window.openArgos?.getModelKeys?.();
    if (!result?.ok) {
      modelKeysLoaded = true;
      renderLocalModelState();
      return;
    }
    const localProvider = getScopedStorageItem(modelKeyProviderKey);
    byokState = {
      activeProvider: normalizeByokProvider(localProvider || result.activeProvider),
      keys: result.keys || {}
    };
    modelKeysLoaded = true;
    voiceTranscriptionState = {
      ...voiceTranscriptionState,
      hasOpenAIKey: Boolean(result.keys?.openai?.hasKey),
      hasGroqKey: Boolean(result.keys?.groq?.hasKey)
    };
    renderLocalModelState();
  } catch {
    modelKeysLoaded = true;
    renderLocalModelState();
  }
}

async function initializeModelState() {
  await loadModelKeyState();
  await loadVoiceTranscriptionState();
  await loadLocalModelState();
}

async function loadLocalModelState() {
  try {
    const result = await window.openArgos?.getModelPolicy?.();
    if (!result?.ok) {
      localModelState = {
        ...localModelState,
        canManage: true
      };
      renderLocalModelState();
      return;
    }
    const settings = normalizeLocalModelPolicy(result.settings || result.rawSettings || {});
    localModelState = {
      ...localModelState,
      ...settings,
      keyLastFour: result.rawSettings?.keyLastFour,
      keyStatus: result.rawSettings?.keyStatus,
      keyUpdatedAt: result.rawSettings?.keyUpdatedAt,
      providerKeys: result.rawSettings?.providerKeys || result.settings?.providerKeys || {},
      canManage: Boolean(result.canManage)
    };
    byokState.activeProvider = normalizeByokProvider(localModelState.provider);
    setPrimaryModel(localModelState.model, { syncLocal: false });
    renderLocalModelState();
  } catch {
    localModelState = {
      ...localModelState,
      canManage: true
    };
    renderLocalModelState();
  }
}

async function saveLocalModelState(nextPolicy = {}) {
  if (!canManageModels()) {
    renderLocalModelState();
    return;
  }
  const next = normalizeLocalModelPolicy({
    ...localModelState,
    ...nextPolicy
  });
  const previous = { ...localModelState };
  localModelState = {
    ...localModelState,
    ...next
  };
  byokState.activeProvider = normalizeByokProvider(next.provider);
  renderLocalModelState();

  try {
    const result = await window.openArgos?.updateModelPolicy?.(next);
    if (!result?.ok) throw new Error(result?.message || "Could not update AI configuration.");
    localModelState = {
      ...localModelState,
      ...normalizeLocalModelPolicy(result.settings || next),
      providerKeys: result.rawSettings?.providerKeys || localModelState.providerKeys || {},
      keyLastFour: result.rawSettings?.keyLastFour,
      keyStatus: result.rawSettings?.keyStatus,
      keyUpdatedAt: result.rawSettings?.keyUpdatedAt,
      canManage: true
    };
    renderLocalModelState();
  } catch (error) {
    localModelState = previous;
    byokState.activeProvider = normalizeByokProvider(previous.provider);
    setPrimaryModel(previous.model, { syncLocal: false });
    renderLocalModelState();
    const status = getProviderStatus(next.provider);
    if (status) {
      setByokStatus(status, error?.message || "Could not update AI configuration.", "warning", "triangleAlert");
    }
  }
}

async function setModelKeyProvider(provider, { syncLocal = true, syncMain = true, toggle = true } = {}) {
  const current = normalizeByokProvider(byokState.activeProvider);
  const normalized = normalizeByokProvider(provider);
  if (!providerHasSavedKey(normalized)) {
    renderModelKeyState();
    return;
  }
  const next = toggle && current === normalized ? "" : normalized;
  byokState.activeProvider = next;
  setScopedStorageItem(modelKeyProviderKey, next);
  const preferredModel = !next
    ? localModelState.model
    : (providerForModel(localModelState.model) === next
      ? localModelState.model
      : defaultModelForProvider(next));
  const resolvedModel = fallbackModelForSource("local", preferredModel);
  localModelState = {
    ...localModelState,
    source: "local",
    provider: providerForModel(resolvedModel),
    model: resolvedModel
  };
  if (localModelState.model) setPrimaryModel(localModelState.model, { syncLocal: false });
  renderModelKeyState();

  if (syncMain) {
    try {
      await window.openArgos?.setModelKeyProvider?.(next);
    } catch {
      // Keep the renderer selection as the offline fallback.
    }
  }

  if (syncLocal) {
    await saveLocalModelState(localModelState);
  }
}

async function saveProviderKey(provider) {
  const input = getProviderInput(provider);
  if (!input || !input.dataset.dirty) return;
  const status = getProviderStatus(provider);
  const validation = validateModelApiKey(provider, input.value);

  if (!validation.ok) {
    setByokStatus(status, validation.message, "warning", "triangleAlert");
    return;
  }

  try {
    const result = await window.openArgos?.saveModelKey?.({ provider, key: validation.key });
    if (!result?.ok) throw new Error(result?.message || "Could not save key.");
    byokState = {
      activeProvider: provider === "groq"
        ? normalizeByokProvider(byokState.activeProvider)
        : normalizeByokProvider(result.activeProvider || byokState.activeProvider),
      keys: result.keys || byokState.keys
    };
    const savedKeyState = byokState.keys?.[provider] || {};
    localModelState = {
      ...localModelState,
      providerKeys: {
        ...(localModelState.providerKeys || {}),
        [provider]: {
          status: savedKeyState.hasKey ? "configured" : "removed",
          keyLastFour: savedKeyState.lastFour || null,
          keyUpdatedAt: Date.now(),
          storage: "local_keychain"
        }
      }
    };
    if (llmKeyProviders.includes(provider) && !modelIsAvailableForSource(localModelState.model, "local")) {
      const nextSource = "local";
      const nextModel = fallbackModelForSource(nextSource, defaultModelForProvider(normalizeByokProvider(provider)));
      localModelState = {
        ...localModelState,
        source: nextSource,
        provider: providerForModel(nextModel),
        model: nextModel
      };
      await saveLocalModelState(localModelState);
    }
    input.value = "";
    delete input.dataset.dirty;
    renderLocalModelState();
    if (provider === "groq" || provider === "openai") await loadVoiceTranscriptionState();
  } catch (error) {
    setByokStatus(status, error?.message || "Could not save key.", "warning", "triangleAlert");
  }
}

async function removeProviderKey(provider) {
  const input = getProviderInput(provider);
  const status = getProviderStatus(provider);
  window.clearTimeout(byokSaveTimers.get(provider));
  if (input) {
    input.value = "";
    input.dataset.dirty = "true";
  }
  setByokStatus(status, "Removing...");
  await saveProviderKey(provider);
}

function scheduleProviderKeySave(provider) {
  const input = getProviderInput(provider);
  const status = getProviderStatus(provider);
  if (input) input.dataset.dirty = "true";
  setByokStatus(status, "Saving...");

  window.clearTimeout(byokSaveTimers.get(provider));
  byokSaveTimers.set(provider, window.setTimeout(() => saveProviderKey(provider), 650));
}

byokInputs.forEach((input) => {
  input.addEventListener("input", () => scheduleProviderKeySave(input.dataset.byokKey));
  input.addEventListener("blur", () => {
    window.clearTimeout(byokSaveTimers.get(input.dataset.byokKey));
    saveProviderKey(input.dataset.byokKey);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });
});

byokRemoveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void removeProviderKey(button.dataset.byokRemove);
  });
});

async function setVoiceTranscriptionProvider(provider) {
  const normalized = normalizeVoiceTranscriptionProvider(provider);
  if (normalized && !voiceTranscriptionProviderHasKey(normalized)) {
    renderModelKeyState();
    return;
  }
  const previous = { ...voiceTranscriptionState };
  voiceTranscriptionState = {
    ...voiceTranscriptionState,
    provider: normalized,
    enabled: Boolean(normalized && voiceTranscriptionProviderHasKey(normalized))
  };
  renderModelKeyState();

  try {
    const result = await window.openArgos?.setVoiceTranscriptionProvider?.(normalized);
    if (!result?.ok) throw new Error(result?.message || "Could not update voice transcription.");
    voiceTranscriptionState = {
      provider: normalizeVoiceTranscriptionProvider(result.provider),
      enabled: Boolean(result.enabled),
      hasOpenAIKey: Boolean(result.hasOpenAIKey),
      hasGroqKey: Boolean(result.hasGroqKey),
      models: result.models || voiceTranscriptionState.models || {}
    };
    renderModelKeyState();
  } catch (error) {
    voiceTranscriptionState = previous;
    renderModelKeyState();
    renderVoiceModelStatus(error?.message || "Could not update voice transcription.", "warning", "triangleAlert");
  }
}

window.openArgos?.onVoiceTranscriptionSettingsChanged?.((payload = {}) => {
  if (!payload?.ok) return;
  voiceTranscriptionState = {
    provider: normalizeVoiceTranscriptionProvider(payload.provider),
    enabled: Boolean(payload.enabled),
    hasOpenAIKey: Boolean(payload.hasOpenAIKey),
    hasGroqKey: Boolean(payload.hasGroqKey),
    models: payload.models || voiceTranscriptionState.models || {}
  };
  renderModelKeyState();
});

function syncUserScopedState() {
  clearObsoleteSharedStorage();
  const themeChoice = getScopedStorageItem(themeKey);
  if (themeChoice) applyTheme(themeChoice);
  if (ambientSoundToggle) {
    ambientSoundToggle.checked = getScopedStorageItem(ambientSoundKey) !== "false";
  }
  updateAmbientSoundTypeVisibility();
  renderAmbientSoundType(getScopedStorageItem(ambientSoundTypeKey));
  if (muteMusicWhileDictatingToggle) {
    muteMusicWhileDictatingToggle.checked = getScopedStorageItem(muteMusicWhileDictatingKey) !== "false";
  }
  if (computerUseToggle) {
    computerUseToggle.checked = getScopedStorageItem(computerUseKey) === "true";
    renderComputerUseAvailability();
  }
  computerUseSettingsState = {
    ...computerUseSettingsState,
    backend: normalizeComputerUseBackend(getScopedStorageItem(computerUseBackendKey))
  };
  renderComputerUseBackend();
  renderCuaKeyState();
  if (screenAwarenessToggle) {
    screenAwarenessToggle.checked = getScopedStorageItem(screenAwarenessKey) !== "false";
  }
  renderMemoryCaptureState();
  pinnedChatIds = readPinnedChatIds();
  renderShortcutSettings(readShortcutSettings());
  window.openArgos?.getShortcuts?.().then((result) => {
    if (result?.shortcuts) {
      writeShortcutSettings(result.shortcuts);
      renderShortcutSettings(result.shortcuts);
    }
  }).catch(() => {});
  renderMemories();
  localModelState = {
    ...localModelState,
    model: getScopedStorageItem(primaryModelKey) ?? ""
  };
  renderLocalModelState();
  void initializeModelState();
  void loadComputerUseSettings();
}

async function syncLocalSettings() {
  if (!currentLocalSession?.user || !window.openArgos?.getUserSettings) return;
  try {
    const result = await window.openArgos.getUserSettings();
    if (!result?.ok || !result.settings) return;
    if (result.settings.theme) {
      setScopedStorageItem(themeKey, result.settings.theme);
      applyTheme(result.settings.theme, { sync: false });
    }
    if (result.settings.primaryModel) {
      if (modelKeysLoaded) {
        setPrimaryModel(result.settings.primaryModel, { syncLocal: false });
      } else {
        localModelState = {
          ...localModelState,
          model: result.settings.primaryModel
        };
      }
    }
    if (modelKeysLoaded && result.settings.modelKeyProvider) {
      await setModelKeyProvider(result.settings.modelKeyProvider, { syncLocal: false, toggle: false });
    }
    if (typeof result.settings.showMenuBar === "boolean" && menuBarToggle) {
      menuBarToggle.checked = result.settings.showMenuBar;
      window.localStorage.setItem(menuBarKey, String(result.settings.showMenuBar));
      await window.openArgos?.setMenuBarVisible?.(result.settings.showMenuBar);
    }
    if (typeof result.settings.ambientSoundEnabled === "boolean" && ambientSoundToggle) {
      ambientSoundToggle.checked = result.settings.ambientSoundEnabled;
      setScopedStorageItem(ambientSoundKey, String(result.settings.ambientSoundEnabled));
      updateAmbientSoundTypeVisibility();
    }
    if (result.settings.ambientSoundType) {
      await setAmbientSoundType(result.settings.ambientSoundType, { syncLocal: false });
    }
    if (typeof result.settings.muteMusicWhileDictating === "boolean" && muteMusicWhileDictatingToggle) {
      muteMusicWhileDictatingToggle.checked = result.settings.muteMusicWhileDictating;
      setScopedStorageItem(muteMusicWhileDictatingKey, String(result.settings.muteMusicWhileDictating));
    }
    if (typeof result.settings.computerUseEnabled === "boolean" && computerUseToggle) {
      computerUseToggle.checked = result.settings.computerUseEnabled;
      setScopedStorageItem(computerUseKey, String(result.settings.computerUseEnabled));
      renderComputerUseAvailability();
    }
    if (result.settings.computerUseBackend !== undefined) {
      computerUseSettingsState = {
        ...computerUseSettingsState,
        backend: normalizeComputerUseBackend(result.settings.computerUseBackend)
      };
      setScopedStorageItem(computerUseBackendKey, computerUseSettingsState.backend);
      renderComputerUseBackend();
    }
    if (typeof result.settings.screenAwarenessEnabled === "boolean" && screenAwarenessToggle) {
      screenAwarenessToggle.checked = result.settings.screenAwarenessEnabled;
      setScopedStorageItem(screenAwarenessKey, String(result.settings.screenAwarenessEnabled));
    }
    if (typeof result.settings.memoryCaptureEnabled === "boolean") {
      setScopedStorageItem(memoryCaptureKey, String(result.settings.memoryCaptureEnabled));
      renderMemoryCaptureState();
    }
    if (result.settings.voiceTranscriptionProvider !== undefined) {
      voiceTranscriptionState = {
        ...voiceTranscriptionState,
        provider: normalizeVoiceTranscriptionProvider(result.settings.voiceTranscriptionProvider)
      };
      renderModelKeyState();
    }
    if (result.settings.shortcuts) {
      const shortcuts = writeShortcutSettings(result.settings.shortcuts);
      renderShortcutSettings(shortcuts);
      window.openArgos?.updateShortcuts?.(shortcuts)?.catch?.(() => {});
    }
  } catch {
    // Local scoped cache remains the offline fallback.
  }
}

async function syncLocalMemories() {
  if (!currentLocalSession?.user || !window.openArgos?.listMemories) return;
  try {
    const result = await window.openArgos.listMemories();
    if (!result?.ok || !Array.isArray(result.memories)) return;
    saveMemories(result.memories);
    renderMemories();
  } catch {
    // Local scoped cache remains the offline fallback.
  }
}

function syncLocalState() {
  void syncLocalSettings();
  void syncLocalMemories();
  if (document.querySelector(".page.active")?.id === "history") {
    void loadAmbientHistory({ force: true });
  }
}

function normalizeAmbientSoundType(value) {
  if (
    value === "bright_ping" ||
    value === "focus_tap" ||
    value === "soft_pulse" ||
    value === "glass_bell" ||
    value === "warm_lift" ||
    value === "arcade_blip" ||
    value === "wood_knock" ||
    value === "sparkle_run" ||
    value === "funk_pop" ||
    value === "electro_bounce"
  ) return value;
  return "default";
}

function ambientSoundTypeLabelFor(value) {
  const normalized = normalizeAmbientSoundType(value);
  if (normalized === "bright_ping") return "Bright ping";
  if (normalized === "focus_tap") return "Focus tap";
  if (normalized === "soft_pulse") return "Soft pulse";
  if (normalized === "glass_bell") return "Glass bell";
  if (normalized === "warm_lift") return "Warm lift";
  if (normalized === "arcade_blip") return "Arcade blip";
  if (normalized === "wood_knock") return "Wood knock";
  if (normalized === "sparkle_run") return "Sparkle run";
  if (normalized === "funk_pop") return "Funk pop";
  if (normalized === "electro_bounce") return "Electro bounce";
  return "Default chime";
}

function updateAmbientSoundTypeVisibility() {
  if (!ambientSoundTypeRow) return;
  const enabled = ambientSoundToggle ? ambientSoundToggle.checked : true;
  ambientSoundTypeRow.hidden = !enabled;
  if (!enabled) closeAmbientSoundTypeMenu();
}

function renderAmbientSoundType(value = getScopedStorageItem(ambientSoundTypeKey)) {
  const normalized = normalizeAmbientSoundType(value);
  if (ambientSoundTypeLabel) ambientSoundTypeLabel.textContent = ambientSoundTypeLabelFor(normalized);
  ambientSoundTypeOptions.forEach((option) => {
    option.classList.toggle("active", option.dataset.ambientSoundTypeOption === normalized);
  });
}

async function setAmbientSoundType(value, { syncLocal = true, preview = false } = {}) {
  const normalized = normalizeAmbientSoundType(value);
  const previous = normalizeAmbientSoundType(getScopedStorageItem(ambientSoundTypeKey));
  setScopedStorageItem(ambientSoundTypeKey, normalized);
  renderAmbientSoundType(normalized);
  if (preview && previous !== normalized && ambientSoundToggle?.checked !== false) {
    void window.openArgos?.previewAmbientSound?.(normalized);
  }
  if (syncLocal && currentLocalSession?.user) {
    try {
      await window.openArgos?.upsertUserSettings?.({ ambientSoundType: normalized });
    } catch {
      // Local scoped cache remains the offline fallback.
    }
  }
}

function setActionButtonLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent || "";
    if (label) button.textContent = label;
    button.disabled = true;
    button.classList.add("loading");
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.disabled = false;
  button.classList.remove("loading");
  button.removeAttribute("aria-busy");
  button.textContent = label || button.dataset.idleLabel || button.textContent;
  delete button.dataset.idleLabel;
}

function showWelcome(session) {
  const name = session?.user?.firstName || session?.user?.name?.split(/\s+/)[0] || "there";
  if (!welcomeGate || !welcomeText) return Promise.resolve();
  welcomeText.textContent = `Welcome, ${name}.`;
  welcomeGate.hidden = false;
  welcomeGate.classList.remove("leaving");

  return new Promise((resolve) => {
    window.setTimeout(() => {
      welcomeGate.classList.add("leaving");
    }, 820);

    window.setTimeout(() => {
      welcomeGate.hidden = true;
      welcomeGate.classList.remove("leaving");
      resolve();
    }, 1460);
  });
}

function setFieldError(container, message = "") {
  if (!container) return;
  const label = container.querySelector("span");
  if (label) label.textContent = message;
  container.hidden = !message;
}

function historyScope(session = currentLocalSession) {
  return session?.user?.id || "local-user";
}

function formatHistoryTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function compactHistoryText(text, max = 220) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function normalizeHistorySearchQuery(query) {
  return String(query || "").replace(/\s+/g, " ").trim();
}

function isHistorySearchActive() {
  return historySearchQuery.length > 0;
}

function historyChatType(session = {}) {
  const type = String(session.chatType || "").trim().toLowerCase();
  return "assistant";
}

function filterHistorySessions(rows = []) {
  const sessions = rows.filter(Boolean);
  return sessions.filter((session) => historyChatType(session) === "assistant");
}

function readPinnedChatIds() {
  try {
    const parsed = JSON.parse(getScopedStorageItem(pinnedChatsKey) || "[]");
    return Array.isArray(parsed) ? parsed.map((id) => String(id || "")).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writePinnedChatIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || "")).filter(Boolean)));
  pinnedChatIds = uniqueIds;
  setScopedStorageItem(pinnedChatsKey, JSON.stringify(uniqueIds));
}

function isChatPinned(sessionOrId = "") {
  const id = typeof sessionOrId === "string" ? sessionOrId : sessionOrId?.id;
  return pinnedChatIds.includes(String(id || ""));
}

function togglePinnedChat(session = {}) {
  if (!session?.id) return;
  const id = String(session.id);
  if (isChatPinned(id)) {
    writePinnedChatIds(pinnedChatIds.filter((pinnedId) => pinnedId !== id));
  } else {
    writePinnedChatIds([id, ...pinnedChatIds]);
  }
  renderChatSidebar();
}

function historyMessageUsedComputerUse(message = {}) {
  const metadata = message?.metadata || {};
  const actionType = String(metadata.actionType || "");
  if (actionType === "computer_use_approved") return true;
  if (metadata.pendingComputerUseApproval || actionType === "computer_use_cancelled" || actionType === "computer_use_unavailable") {
    return false;
  }
  return Number(metadata.computerUseSteps || 0) > 0 ||
    (Array.isArray(metadata.steps) && metadata.steps.length > 0);
}

function historySessionUsedComputerUse(session = {}) {
  return Boolean(
    session.hasComputerUse ||
      (Array.isArray(session.messages) && session.messages.some(historyMessageUsedComputerUse))
  );
}

function createHistorySessionIcon(session = {}) {
  const type = historyChatType(session);
  const config = {
    assistant: {
      icon: "messageSquare",
      title: "Assistant",
      body: "You started this chat with OpenArgos."
    }
  }[type] || {
    icon: "messageSquare",
    title: "Assistant",
    body: "You started this chat with OpenArgos."
  };
  const icon = document.createElement("span");
  icon.className = `history-session-icon history-session-icon-${type}`;
  icon.innerHTML = lucideIcon(config.icon);
  if (historySessionUsedComputerUse(session)) {
    const badge = document.createElement("span");
    badge.className = "history-session-action-badge is-computer-use";
    badge.setAttribute("aria-label", "Computer Use");
    badge.title = "Computer Use";
    badge.innerHTML = lucideIcon("monitor");
    icon.append(badge);
  }
  return icon;
}

async function openAmbientHistorySession(session = {}, control = null) {
  if (!session?.id || control?.disabled) return;
  activeSidebarChatId = session.id;
  chatSidebarMode = "session";
  updateChatsParentState();
  renderChatSidebar();
  if (control) control.disabled = true;
  const row = control?.closest?.(".history-session");
  row?.classList.add("opening");
  try {
    const result = await window.openArgos?.resumeAmbientSession?.(session.id);
    if (!result?.ok) throw new Error(result?.message || "Could not open chat.");
  } catch (error) {
    console.error("Failed to open chat", error);
  } finally {
    window.setTimeout(() => {
      row?.classList.remove("opening");
      if (control) control.disabled = false;
    }, 500);
  }
}

function renderChatSidebar(rows = ambientHistoryRows) {
  if (!chatSubtabs) return;
  chatSubtabs.textContent = "";
  const sessions = filterHistorySessions(rows).filter((session) => session?.id);
  const sessionIds = new Set(sessions.map((session) => session.id));
  const visiblePinnedIds = pinnedChatIds.filter((id) => sessionIds.has(id));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const pinnedSessions = visiblePinnedIds.map((id) => sessionById.get(id)).filter(Boolean);
  const pinnedSet = new Set(visiblePinnedIds);
  const recentSessions = sessions.filter((session) => !pinnedSet.has(session.id));
  chatSubtabs.hidden = false;
  chatSubtabs.classList.toggle("is-expanded", chatSubtabsExpanded);
  chatsParent?.setAttribute("aria-expanded", String(chatSubtabsExpanded));
  chatsParent?.classList.toggle("is-expanded", chatSubtabsExpanded);

  const appendSectionLabel = (label, iconName = "") => {
    const element = document.createElement("div");
    element.className = "chat-subsection-label";
    if (iconName) {
      const icon = document.createElement("span");
      icon.className = "chat-subsection-icon";
      icon.innerHTML = lucideIcon(iconName);
      element.append(icon);
    }
    const text = document.createElement("span");
    text.className = "chat-subsection-text";
    text.textContent = label;
    element.append(text);
    chatSubtabs.append(element);
  };

  const appendChatRow = (session) => {
    const row = document.createElement("div");
    row.className = "chat-child-row";
    row.classList.toggle("active", activeSidebarChatId === session.id);
    row.classList.toggle("pinned", isChatPinned(session));

    const button = document.createElement("button");
    button.className = "tab settings-child-tab chat-child-tab";
    button.type = "button";
    button.dataset.chatSessionId = session.id;
    button.classList.toggle("active", activeSidebarChatId === session.id);
    button.setAttribute("aria-label", `Open chat: ${session.title || "Chat"}`);
    const title = document.createElement("span");
    title.className = "chat-child-title";
    title.textContent = compactHistoryText(session.title || "Chat", 54);
    button.append(title);
    const openSession = () => {
      setSidebarMode("app");
      lastAppTab = "history";
      void openAmbientHistorySession(session, button);
    };
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openSession();
    });
    row.addEventListener("click", (event) => {
      if (event.target.closest(".chat-child-action")) return;
      openSession();
    });

    const actionButton = document.createElement("button");
    actionButton.className = "icon-button chat-child-action";
    actionButton.type = "button";
    actionButton.dataset.chatActionsFor = session.id;
    actionButton.setAttribute("aria-label", `More actions for ${session.title || "Chat"}`);
    actionButton.setAttribute("aria-haspopup", "menu");
    actionButton.setAttribute("aria-expanded", "false");
    actionButton.innerHTML = lucideIcon("ellipsis");
    actionButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (chatActionMenu && !chatActionMenu.hidden && activeChatActionSession?.id === session.id) {
        closeChatActionMenu();
      } else {
        openChatActionMenu(session, actionButton);
      }
    });

    row.append(button, actionButton);
    chatSubtabs.append(row);
  };

  if (pinnedSessions.length) {
    appendSectionLabel("Pinned", "pin");
    pinnedSessions.forEach(appendChatRow);
    if (recentSessions.length) appendSectionLabel("Chats");
    recentSessions.forEach(appendChatRow);
  } else {
    sessions.forEach(appendChatRow);
  }
  scheduleChatSubtabsScrollStateUpdate();
}

function updateHistorySessionInRows(session = {}) {
  if (!session?.id) return;
  const mergeSession = (row) => row?.id === session.id ? { ...row, ...session } : row;
  ambientHistoryRows = ambientHistoryRows.map(mergeSession);
  historySearchRows = historySearchRows.map(mergeSession);
}

function removeHistorySessionFromRows(threadId = "") {
  if (!threadId) return;
  ambientHistoryRows = ambientHistoryRows.filter((row) => row?.id !== threadId);
  historySearchRows = historySearchRows.filter((row) => row?.id !== threadId);
  if (isChatPinned(threadId)) writePinnedChatIds(pinnedChatIds.filter((id) => id !== threadId));
  if (activeSidebarChatId === threadId) {
    activeSidebarChatId = "";
    chatSidebarMode = "page";
    updateChatsParentState();
  }
}

function setChatModalError(detail, defaultText, message = "") {
  if (!detail) return;
  detail.textContent = message || defaultText;
  if (message) {
    detail.dataset.error = "true";
  } else {
    delete detail.dataset.error;
  }
}

function setChatRenameModal(open, session = null) {
  if (!chatRenameModal || !chatRenameInput) return;
  chatRenameModal.hidden = !open;
  document.body.classList.toggle("modal-open", open);
  chatModalSession = open ? session : null;
  setActionButtonLoading(chatRenameSave, false, "Save");
  setChatModalError(chatRenameDetail, "Update the title shown in the Chats sidebar.");
  if (open) {
    chatRenameInput.value = session?.title || "Chat";
    window.requestAnimationFrame(() => {
      chatRenameInput.focus();
      chatRenameInput.select();
    });
  }
}

function setChatDeleteModal(open, session = null) {
  if (!chatDeleteModal) return;
  chatDeleteModal.hidden = !open;
  document.body.classList.toggle("modal-open", open);
  chatModalSession = open ? session : null;
  setActionButtonLoading(chatDeleteConfirm, false, "Delete");
  const title = compactHistoryText(session?.title || "this chat", 52);
  setChatModalError(chatDeleteDetail, `Delete "${title}" from your Chats list?`);
}

function setHistoryLoadingState() {
  if (!historyEmpty) return;
  historyPanel?.classList.add("is-loading");
  historyEmpty.classList.add("history-loading-skeleton");
  historyEmpty.replaceChildren(document.createElement("span"), document.createElement("span"));
  renderChatSidebar([]);
}

function setHistoryEmptyMessage(message) {
  if (!historyEmpty) return;
  historyPanel?.classList.remove("is-loading");
  historyEmpty.classList.remove("history-loading-skeleton");
  historyEmpty.textContent = message;
}

function setHistoryLoadMoreState() {
  if (!historyLoadMore || !historyViewMoreButton) return;
  const loadedSessionCount = filterHistorySessions(ambientHistoryRows).length;
  const canShowLoadedRows = ambientHistoryVisibleCount < loadedSessionCount;
  historyLoadMore.hidden = isHistorySearchActive() || (!canShowLoadedRows && !ambientHistoryHasMore);
  historyViewMoreButton.disabled = ambientHistoryLoadingMore;
  historyViewMoreButton.classList.toggle("loading", ambientHistoryLoadingMore);
  historyViewMoreButton.textContent = ambientHistoryLoadingMore ? "Loading..." : "View more";
}

function revealNextAmbientHistoryPage() {
  const loadedSessionCount = filterHistorySessions(ambientHistoryRows).length;
  ambientHistoryVisibleCount = Math.min(
    loadedSessionCount,
    ambientHistoryVisibleCount + ambientHistoryPageSize
  );
}

function renderAmbientHistory(rows = isHistorySearchActive() ? historySearchRows : ambientHistoryRows) {
  if (!historyList || !historyEmpty) return;
  historyPanel?.classList.remove("is-loading");
  historyEmpty.classList.remove("history-loading-skeleton");
  historyList.textContent = "";
  if (historySearchClear) historySearchClear.hidden = !isHistorySearchActive();
  if (historySearchLoading) {
    historyList.hidden = true;
    historyEmpty.hidden = false;
    historyEmpty.textContent = "Searching chats...";
    renderChatSidebar(ambientHistoryRows);
    setHistoryLoadMoreState();
    return;
  }
  const sessions = filterHistorySessions(rows);
  const visibleSessions = isHistorySearchActive()
    ? sessions
    : sessions.slice(0, ambientHistoryVisibleCount);
  historyList.hidden = visibleSessions.length === 0;
  historyEmpty.hidden = visibleSessions.length > 0;
  if (historySearchError) {
    historyEmpty.textContent = historySearchError;
  } else if (isHistorySearchActive()) {
    historyEmpty.textContent = `No chats found for "${historySearchQuery}".`;
  } else {
    historyEmpty.textContent = rows.filter(Boolean).length ? "No chats in this view." : "No chats yet.";
  }
  renderChatSidebar(ambientHistoryRows);

  visibleSessions.forEach((session) => {
    const chatType = historyChatType(session);
    const row = document.createElement("article");
    row.className = `history-session history-session-${chatType}`;

    const button = document.createElement("button");
    button.className = "history-session-summary";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${chatType} chat: ${session.title || "Chat"}`);

    const icon = createHistorySessionIcon(session);

    const copy = document.createElement("div");
    copy.className = "history-copy";

    const header = document.createElement("div");
    header.className = "history-row-header";

    const title = document.createElement("div");
    title.className = "history-title";
    title.textContent = compactHistoryText(session.title || "Chat", 90);

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const messageCount = Number(session.messageCount || session.messages?.length || 0);
    const timestamp = formatHistoryTime(session.updatedAt || session.createdAt);
    if (timestamp) {
      const time = document.createElement("span");
      time.className = "history-meta-time";
      time.textContent = timestamp;
      meta.append(time);
    }
    if (messageCount) {
      if (timestamp) meta.append(document.createTextNode(" "));
      const count = document.createElement("span");
      count.className = "history-meta-count";
      count.textContent = `(${messageCount} ${messageCount === 1 ? "msg" : "msgs"})`;
      meta.append(count);
    }

    const detail = document.createElement("div");
    detail.className = "history-detail";
    detail.textContent = compactHistoryText(session.preview || "No messages yet.");

    header.append(title, meta);
    copy.append(header, detail);
    button.append(icon, copy);

    button.addEventListener("click", () => void openAmbientHistorySession(session, button));

    row.append(button);
    historyList.append(row);
  });
  setHistoryLoadMoreState();
}

async function runHistorySearch(query = historySearchInput?.value, { immediate = false } = {}) {
  const normalizedQuery = normalizeHistorySearchQuery(query);
  window.clearTimeout(historySearchTimer);
  historySearchQuery = normalizedQuery;
  if (historySearchClear) historySearchClear.hidden = !normalizedQuery;

  if (!normalizedQuery) {
    historySearchRows = [];
    historySearchError = "";
    historySearchLoading = false;
    historySearchRequestId += 1;
    renderAmbientHistory();
    return;
  }

  const execute = async () => {
    const requestId = ++historySearchRequestId;
    historySearchLoading = true;
    historySearchError = "";
    renderAmbientHistory();
    try {
      const result = await window.openArgos?.searchAmbientHistory?.({
        query: normalizedQuery,
        limit: ambientHistoryPageSize
      });
      if (requestId !== historySearchRequestId) return;
      if (!result?.ok) throw new Error(result?.message || "Could not search chats.");
      historySearchRows = Array.isArray(result.sessions) ? result.sessions : [];
    } catch {
      if (requestId !== historySearchRequestId) return;
      historySearchRows = [];
      historySearchError = "Could not search chats.";
    } finally {
      if (requestId !== historySearchRequestId) return;
      historySearchLoading = false;
      renderAmbientHistory();
    }
  };

  if (immediate) {
    await execute();
    return;
  }
  historySearchTimer = window.setTimeout(() => {
    void execute();
  }, 160);
}

async function loadAmbientHistory({ force = false } = {}) {
  if (!historyList || !historyEmpty) return;
  const scope = historyScope();
  if (!force && ambientHistoryLoadedFor === scope) return;
  ambientHistoryLoadedFor = scope;
  ambientHistoryCursor = null;
  ambientHistoryHasMore = false;
  ambientHistoryLoadingMore = false;
  ambientHistoryVisibleCount = ambientHistoryPageSize;
  setHistoryLoadingState();
  setHistoryLoadMoreState();
  historyEmpty.hidden = false;
  historyList.hidden = true;

  try {
    const result = await window.openArgos?.listAmbientHistory?.({ limit: ambientHistoryFetchPageSize });
    if (!result?.ok) throw new Error(result?.message || "Could not load chats.");
    ambientHistoryRows = Array.isArray(result.sessions) ? result.sessions : [];
    ambientHistoryCursor = result.nextCursor || null;
    ambientHistoryHasMore = Boolean(result.hasMore);
    setHistoryEmptyMessage("No chats yet.");
    renderAmbientHistory();
  } catch {
    ambientHistoryRows = [];
    ambientHistoryCursor = null;
    ambientHistoryHasMore = false;
    ambientHistoryLoadingMore = false;
    setHistoryEmptyMessage("Could not load chats.");
    setHistoryLoadMoreState();
    historyEmpty.hidden = false;
    historyList.hidden = true;
  }
}

async function loadMoreAmbientHistory() {
  if (!historyViewMoreButton || isHistorySearchActive() || ambientHistoryLoadingMore) return;
  const loadedSessionCount = filterHistorySessions(ambientHistoryRows).length;
  if (ambientHistoryVisibleCount < loadedSessionCount) {
    revealNextAmbientHistoryPage();
    renderAmbientHistory();
    return;
  }
  if (!ambientHistoryHasMore) return;
  ambientHistoryLoadingMore = true;
  setHistoryLoadMoreState();
  try {
    const result = await window.openArgos?.listAmbientHistory?.({
      limit: ambientHistoryFetchPageSize,
      ...(ambientHistoryCursor?.beforeUpdatedAt ? { beforeUpdatedAt: ambientHistoryCursor.beforeUpdatedAt } : {})
    });
    if (!result?.ok) throw new Error(result?.message || "Could not load more chats.");
    const incoming = Array.isArray(result.sessions) ? result.sessions : [];
    const existingIds = new Set(ambientHistoryRows.map((row) => row?.id).filter(Boolean));
    incoming.forEach((session) => {
      if (!session?.id || existingIds.has(session.id)) return;
      existingIds.add(session.id);
      ambientHistoryRows.push(session);
    });
    ambientHistoryCursor = result.nextCursor || null;
    ambientHistoryHasMore = Boolean(result.hasMore);
    revealNextAmbientHistoryPage();
    renderAmbientHistory();
  } catch {
    // Keep the existing list stable; the user can retry the button.
  } finally {
    ambientHistoryLoadingMore = false;
    setHistoryLoadMoreState();
  }
}

historyViewMoreButton?.addEventListener("click", () => {
  void loadMoreAmbientHistory();
});

historySearchInput?.addEventListener("input", () => {
  void runHistorySearch(historySearchInput.value);
});

historySearchInput?.addEventListener("search", () => {
  void runHistorySearch(historySearchInput.value, { immediate: true });
});

historySearchClear?.addEventListener("click", () => {
  if (historySearchInput) historySearchInput.value = "";
  void runHistorySearch("", { immediate: true });
  historySearchInput?.focus();
});

function dismissOnBackdropClick(backdrop, dismiss) {
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) dismiss();
  });
}

dismissOnBackdropClick(inboxResponseModal, closeInboxResponseModal);
dismissOnBackdropClick(profileModal, () => setProfileModal(false));
dismissOnBackdropClick(chatRenameModal, () => setChatRenameModal(false));
dismissOnBackdropClick(chatDeleteModal, () => setChatDeleteModal(false));

chatRenameCancel?.addEventListener("click", () => setChatRenameModal(false));
chatDeleteCancel?.addEventListener("click", () => setChatDeleteModal(false));

chatRenameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = chatRenameInput?.value.trim();
  const session = chatModalSession;
  if (!session?.id || !title) {
    setChatModalError(chatRenameDetail, "Update the title shown in the Chats sidebar.", "Enter a chat title.");
    return;
  }
  setActionButtonLoading(chatRenameSave, true, "Saving");
  setChatModalError(chatRenameDetail, "Update the title shown in the Chats sidebar.");
  try {
    const result = await window.openArgos?.renameAmbientSession?.({
      threadId: session.id,
      title
    });
    if (!result?.ok || !result.session) throw new Error(result?.message || "Could not rename chat.");
    updateHistorySessionInRows(result.session);
    setChatRenameModal(false);
    renderAmbientHistory();
  } catch (error) {
    setChatModalError(chatRenameDetail, "Update the title shown in the Chats sidebar.", error?.message || "Could not rename chat.");
  } finally {
    setActionButtonLoading(chatRenameSave, false, "Save");
  }
});

chatDeleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = chatModalSession;
  if (!session?.id) return;
  setActionButtonLoading(chatDeleteConfirm, true, "Deleting");
  const defaultText = `Delete "${compactHistoryText(session.title || "this chat", 52)}" from your Chats list?`;
  setChatModalError(chatDeleteDetail, defaultText);
  try {
    const result = await window.openArgos?.deleteAmbientSession?.(session.id);
    if (!result?.ok) throw new Error(result?.message || "Could not delete chat.");
    removeHistorySessionFromRows(session.id);
    setChatDeleteModal(false);
    renderAmbientHistory();
  } catch (error) {
    setChatModalError(chatDeleteDetail, defaultText, error?.message || "Could not delete chat.");
  } finally {
    setActionButtonLoading(chatDeleteConfirm, false, "Delete");
  }
});

function renderAvatar(target, user, fallbackLetter = "A") {
  if (!target) return;
  const avatarUrl = user?.profilePictureUrl || "";
  const fallback = (user?.name || user?.email || fallbackLetter).trim().slice(0, 1).toUpperCase() || fallbackLetter;
  target.textContent = avatarUrl ? "" : fallback;
  target.style.backgroundImage = avatarUrl ? `url("${avatarUrl}")` : "";
}

function setProfileModal(open) {
  if (!profileModal) return;
  profileModal.hidden = !open;
  document.body.classList.toggle("modal-open", open);
  setFieldError(profileError, "");
  profileAvatarDraft = null;
  setActionButtonLoading(profileSave, false, "Save");
  if (!open) {
    if (profileAvatarInput) profileAvatarInput.value = "";
    return;
  }

  const user = currentLocalSession?.user;
  if (profileName) profileName.value = user?.name || "";
  renderAvatar(profileAvatarPreview, user);
  window.requestAnimationFrame(() => {
    profileName?.focus({ preventScroll: true });
    const end = profileName?.value?.length || 0;
    profileName?.setSelectionRange(end, end);
  });
}

profileAvatarButton?.addEventListener("click", () => {
  profileAvatarInput?.click();
});

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const size = 320;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
      const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      resolve(canvas.toDataURL("image/webp", 0.88));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}

profileAvatarInput?.addEventListener("change", async () => {
  const file = profileAvatarInput.files?.[0];
  if (!file) return;
  setFieldError(profileError, "");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    setFieldError(profileError, "Choose a PNG, JPG, or WebP image.");
    profileAvatarInput.value = "";
    return;
  }
  if (file.size > 5_000_000) {
    setFieldError(profileError, "Choose a smaller image.");
    profileAvatarInput.value = "";
    return;
  }

  try {
    profileAvatarDraft = await resizeProfileImage(file);
    renderAvatar(profileAvatarPreview, {
      ...(currentLocalSession?.user || {}),
      profilePictureUrl: profileAvatarDraft
    });
  } catch (error) {
    setFieldError(profileError, error?.message || "Could not read that image.");
  }
});

profileCancelButtons.forEach((button) => button.addEventListener("click", () => setProfileModal(false)));

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nextName = String(profileName?.value || "").replace(/\s+/g, " ").trim();
  setFieldError(profileError, "");
  if (nextName.length < 2) {
    setFieldError(profileError, "Enter a name.");
    profileName?.focus();
    return;
  }

  const originalLabel = profileSave?.textContent || "Save";
  setActionButtonLoading(profileSave, true, "Saving");

  try {
    const result = await window.openArgos?.updateLocalProfile?.({
      name: nextName,
      avatarUrl: profileAvatarDraft || undefined
    });
    if (!result?.ok) throw new Error(result?.message || "Could not save profile.");
    currentLocalSession = result.session || currentLocalSession;
    renderAccount();
    setProfileModal(false);
  } catch (error) {
    setFieldError(profileError, error?.message || "Could not save profile.");
  } finally {
    setActionButtonLoading(profileSave, false, originalLabel);
  }
});

function renderAccount() {
  const session = currentLocalSession;
  const user = session?.user;
  accountRow?.classList.toggle("signed-in", Boolean(user));
  renderAvatar(accountAvatar, user);
  if (accountName) accountName.textContent = user?.name || "Local user";
  if (accountDetail) accountDetail.textContent = user?.email || "Local profile";
  if (accountToggle) accountToggle.textContent = "Edit profile";
}

function getLocalSessionIdentity(session) {
  if (!session) return "";
  const user = session.user || {};
  return user.id || user.email || "local-user";
}

async function applyLocalSession(session, { welcome = false } = {}) {
  const previousSession = currentLocalSession;
  currentLocalSession = session || {
    provider: "Local",
    mode: "local",
    user: {
      id: "local-user",
      email: "local@openargos.dev",
      name: "Local user"
    }
  };
  const shouldResetNavigation = !currentLocalSession
    || getLocalSessionIdentity(previousSession) !== getLocalSessionIdentity(currentLocalSession);
  if (shouldResetNavigation) resetSessionNavigation();
  syncUserScopedState();
  syncLocalState();
  renderAccount();

  if (welcome) {
    await showWelcome(currentLocalSession);
  }
}

async function initializeLocalSession() {
  try {
    const result = await window.openArgos?.getLocalSession?.();
    await applyLocalSession(result?.session || null);
  } catch {
    await applyLocalSession(null);
  }
}

initializeLocalSession();

function setButtonFeedback(button, text) {
  const previous = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1400);
}

async function refreshLoginItem() {
  if (!window.openArgos?.getLoginItem || !loginToggle) return;
  const result = await window.openArgos.getLoginItem();
  loginToggle.checked = Boolean(result.openAtLogin);
  loginToggle.disabled = false;
  setPermissionRow("launchAtLogin", result.openAtLogin ? "granted" : "not-granted");
}

function setPermissionRow(name, status) {
  const row = permissionRows.find((item) => item.dataset.permission === name);
  if (!row) return;

  const detail = row.querySelector("[data-status]");
  const button = row.querySelector("button");
  const toggle = row.querySelector("[data-login-toggle]");
  const granted = status === "granted";
  const checking = status === "checking";
  const label = permissionCopy[status] ?? status;

  row.classList.toggle("granted", granted);
  row.classList.toggle("denied", !granted);
  row.dataset.status = status;
  if (name === "screenRecording" && screenAwarenessRow) {
    screenAwarenessRow.hidden = !granted;
  }
  if (detail && detail !== button) detail.textContent = label;
  if (toggle) {
    toggle.checked = granted;
    toggle.disabled = checking;
  }

  if (button) {
    button.classList.toggle("enabled", granted);
    button.classList.toggle("not-enabled", !granted && !checking);
    button.classList.toggle("checking", checking);
    if (granted) {
      button.innerHTML = `${lucideIcon("check", "state-button-icon")}<span>${label}</span>`;
    } else {
      button.textContent = label;
    }
    button.dataset.statusValue = status;
  }
}

async function refreshPermissions(names) {
  if (!window.openArgos?.getPermissionStatus) return;
  try {
    const statuses = await window.openArgos.getPermissionStatus(names);
    Object.entries(statuses || {}).forEach(([name, status]) => setPermissionRow(name, status));
  } catch {
    (Array.isArray(names) && names.length ? names : ["screenRecording", "accessibility", "launchAtLogin"])
      .forEach((name) => setPermissionRow(name, "unknown"));
  }
}

function queuePermissionRefreshes(names) {
  [250, 800, 1600, 3000, 5000, 8000, 12000, 20000, 30000, 45000, 60000, 90000, 120000].forEach((delay) => {
    window.setTimeout(() => refreshPermissions(names), delay);
  });
}

function permissionsPageIsActive() {
  return document.querySelector("#settings-permissions.active");
}

actionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    const currentStatus = button.dataset.statusValue;
    try {
      if (currentStatus === "restart-required") {
        await window.openArgos?.relaunch?.();
        return;
      }
      if (action === "screen-recording") {
        setPermissionRow("screenRecording", "checking");
        await window.openArgos.openScreenRecordingSettings();
        await refreshPermissions(["screenRecording"]);
        queuePermissionRefreshes(["screenRecording"]);
        return;
      }
      if (action === "accessibility") {
        setPermissionRow("accessibility", "checking");
        await window.openArgos.openAccessibilitySettings();
        await refreshPermissions(["accessibility"]);
        queuePermissionRefreshes(["accessibility"]);
        return;
      }
      if (action === "notifications") {
        await window.openArgos.requestNotifications();
        setButtonFeedback(button, "Opened");
      }
      await refreshPermissions();
    } catch (error) {
      setButtonFeedback(button, "Failed");
    }
  });
});

loginToggle?.addEventListener("change", async () => {
  if (!window.openArgos?.setLoginItem) return;
  const desired = loginToggle.checked;
  loginToggle.disabled = true;
  setPermissionRow("launchAtLogin", "checking");
  try {
    const result = await window.openArgos.setLoginItem(desired);
    loginToggle.checked = Boolean(result.openAtLogin);
    setPermissionRow("launchAtLogin", result.openAtLogin ? "granted" : "not-granted");
  } catch {
    loginToggle.checked = !desired;
    await refreshLoginItem();
  } finally {
    loginToggle.disabled = false;
  }
});

permissionRows.forEach((row) => setPermissionRow(row.dataset.permission, "checking"));
refreshPermissions();
refreshLoginItem();
window.addEventListener("focus", () => {
  void refreshPermissions();
  void refreshLoginItem();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void refreshPermissions();
    void refreshLoginItem();
  }
});
window.setInterval(() => {
  if (permissionsPageIsActive()) void refreshPermissions();
}, 5000);
window.addEventListener("focus", () => {
  refreshPermissions();
  refreshLoginItem();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshPermissions();
    refreshLoginItem();
  }
});

async function syncMenuBarToggle() {
  if (!menuBarToggle || !window.openArgos?.setMenuBarVisible) return;
  const saved = window.localStorage.getItem(menuBarKey);
  const shouldShow = saved === null ? true : saved === "true";
  menuBarToggle.checked = shouldShow;
  await window.openArgos.setMenuBarVisible(shouldShow);
  const status = await window.openArgos.getMenuBarStatus?.();
  if (status) menuBarToggle.checked = status.visible;
}

menuBarToggle?.addEventListener("change", async () => {
  const visible = menuBarToggle.checked;
  window.localStorage.setItem(menuBarKey, String(visible));
  window.openArgos?.upsertUserSettings?.({ showMenuBar: visible });
  try {
    const status = await window.openArgos?.setMenuBarVisible?.(visible);
    if (status) menuBarToggle.checked = status.visible;
  } catch {
    menuBarToggle.checked = !visible;
  }
});

shortcutRecorders.forEach((button) => {
  button.addEventListener("click", () => {
    recordingShortcutAction = button.dataset.shortcutRecorder || "";
    renderShortcutSettings(readShortcutSettings(), { status: "Press the new shortcut." });
    button.focus();
  });
});

shortcutResetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.shortcutReset;
    if (!action) return;
    recordingShortcutAction = "";
    const next = {
      ...readShortcutSettings(),
      [action]: defaultShortcutSettings[action]
    };
    void saveShortcutSettings(next, { status: "Shortcut reset." });
  });
});

document.addEventListener("keydown", (event) => {
  if (!recordingShortcutAction) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (event.key === "Escape") {
    recordingShortcutAction = "";
    renderShortcutSettings(readShortcutSettings(), { status: "" });
    return;
  }
  const accelerator = shortcutFromKeyboardEvent(event);
  if (!accelerator) {
    renderShortcutSettings(readShortcutSettings(), { status: "Use at least one modifier with a letter, number, or symbol.", error: true });
    return;
  }
  const next = {
    ...readShortcutSettings(),
    [recordingShortcutAction]: accelerator
  };
  const duplicate = duplicateShortcutAction(next, recordingShortcutAction);
  if (duplicate) {
    renderShortcutSettings(readShortcutSettings(), { status: "That shortcut is already assigned.", error: true });
    return;
  }
  recordingShortcutAction = "";
  void saveShortcutSettings(next);
}, true);

window.openArgos?.onShortcutsChanged?.((payload = {}) => {
  if (!payload.shortcuts) return;
  writeShortcutSettings(payload.shortcuts);
  renderShortcutSettings(payload.shortcuts);
});

ambientSoundToggle?.addEventListener("change", () => {
  setScopedStorageItem(ambientSoundKey, String(ambientSoundToggle.checked));
  updateAmbientSoundTypeVisibility();
  window.openArgos?.upsertUserSettings?.({
    ambientSoundEnabled: ambientSoundToggle.checked
  });
});

muteMusicWhileDictatingToggle?.addEventListener("change", () => {
  setScopedStorageItem(muteMusicWhileDictatingKey, String(muteMusicWhileDictatingToggle.checked));
  window.openArgos?.upsertUserSettings?.({
    muteMusicWhileDictating: muteMusicWhileDictatingToggle.checked
  });
});

computerUseToggle?.addEventListener("change", () => {
  const reason = computerUseUnavailableReason();
  if (reason) {
    computerUseToggle.checked = false;
    renderComputerUseAvailability();
    return;
  }
  setScopedStorageItem(computerUseKey, String(computerUseToggle.checked));
  renderComputerUseEngineVisibility();
  window.openArgos?.upsertUserSettings?.({
    computerUseEnabled: computerUseToggle.checked
  });
});

screenAwarenessToggle?.addEventListener("change", () => {
  setScopedStorageItem(screenAwarenessKey, String(screenAwarenessToggle.checked));
  window.openArgos?.upsertUserSettings?.({
    screenAwarenessEnabled: screenAwarenessToggle.checked
  });
});

syncMenuBarToggle();

function loadMemories() {
  try {
    return JSON.parse(getScopedStorageItem(memoriesKey) ?? "[]");
  } catch {
    return [];
  }
}

function saveMemories(memories) {
  setScopedStorageItem(memoriesKey, JSON.stringify(memories));
}

function isMemoryCaptureEnabled() {
  return getScopedStorageItem(memoryCaptureKey) !== "false";
}

function renderMemoryCaptureState() {
  const enabled = isMemoryCaptureEnabled();
  if (memoryCaptureToggle) memoryCaptureToggle.checked = enabled;
  memoryManagedSections.forEach((section) => {
    section.hidden = !enabled;
  });
  if (!enabled) setMemoryModal(false);
}

function isLocalMemoryId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ""));
}

function setMemoryModalError(message = "") {
  if (!memoryModalDetail) return;
  if (message) {
    memoryModalDetail.textContent = message;
    memoryModalDetail.dataset.error = "true";
    return;
  }
  delete memoryModalDetail.dataset.error;
}

function memoryNeedsCollapse(text, element) {
  if (element && element.scrollHeight > 0) return element.scrollHeight > getCollapsedMemoryHeight(element) + 1;
  return text.length > 180 || text.split("\n").length > 4;
}

function updateMemoryCollapse(row, text, toggleButton, memoryText) {
  if (memoryNeedsCollapse(memoryText, text)) {
    row.classList.add("collapsible");
    row.setAttribute("aria-expanded", "false");
    toggleButton.hidden = false;
    text.style.maxHeight = `${getCollapsedMemoryHeight(text)}px`;
  } else {
    row.classList.remove("collapsible", "expanded");
    row.removeAttribute("aria-expanded");
    toggleButton.hidden = true;
    text.style.maxHeight = "";
  }
}

function getCollapsedMemoryHeight(element) {
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 18.5;
  return lineHeight * 4;
}

function setMemoryExpanded(row, content, toggleButton, expanded) {
  const currentHeight = content.getBoundingClientRect().height;
  const targetHeight = expanded ? content.scrollHeight : getCollapsedMemoryHeight(content);
  const label = toggleButton.querySelector("[data-memory-toggle-label]");

  content.style.maxHeight = `${currentHeight}px`;
  content.getBoundingClientRect();
  row.classList.toggle("expanded", expanded);
  row.setAttribute("aria-expanded", String(expanded));
  if (label) label.textContent = expanded ? "Less" : "More";

  window.requestAnimationFrame(() => {
    content.style.maxHeight = `${targetHeight}px`;
  });

  window.setTimeout(() => {
    content.style.maxHeight = expanded
      ? `${content.scrollHeight}px`
      : `${getCollapsedMemoryHeight(content)}px`;
  }, 260);
}

function renderMemories() {
  if (!memoryList || !memoryEmpty) return;
  const memories = loadMemories();
  memoryList.querySelectorAll(".memory-row").forEach((row) => row.remove());
  memoryEmpty.hidden = memories.length > 0;

  memories.forEach((memory) => {
    const row = document.createElement("div");
    row.className = "setting-row memory-row";

    const copy = document.createElement("div");
    copy.className = "setting-copy";

    const text = document.createElement("div");
    text.className = "memory-text";
    text.textContent = memory.text;

    const toggleButton = document.createElement("button");
    toggleButton.className = "memory-toggle";
    toggleButton.type = "button";
    toggleButton.hidden = true;
    toggleButton.innerHTML = `
      <span data-memory-toggle-label>More</span>
      ${lucideIcon("chevronDown", "memory-toggle-chevron")}
    `;
    toggleButton.addEventListener("click", () => {
      const expanded = !row.classList.contains("expanded");
      setMemoryExpanded(row, text, toggleButton, expanded);
    });

    const editButton = document.createElement("button");
    editButton.className = "icon-button memory-edit";
    editButton.type = "button";
    editButton.setAttribute("aria-label", "Edit memory");
    editButton.innerHTML = lucideIcon("pencil");
    editButton.addEventListener("click", () => {
      setMemoryModal(true, memory);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button memory-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Delete memory");
    deleteButton.innerHTML = lucideIcon("trash2");
    deleteButton.addEventListener("click", async () => {
      const before = loadMemories();
      saveMemories(before.filter((item) => item.id !== memory.id));
      renderMemories();
      if (isLocalMemoryId(memory.id)) return;

      const result = await window.openArgos?.deleteMemory?.(memory.id);
      if (!result?.ok) {
        saveMemories(before);
        renderMemories();
      }
    });

    copy.append(text, toggleButton);
    row.append(copy, editButton, deleteButton);
    memoryList.append(row);

    window.requestAnimationFrame(() => updateMemoryCollapse(row, text, toggleButton, memory.text));
  });
}

function setMemoryModal(open, memory = null) {
  if (!memoryModal || !memoryInput) return;
  memoryModal.hidden = !open;
  document.body.classList.toggle("modal-open", open);
  editingMemoryId = open ? memory?.id ?? null : null;
  setActionButtonLoading(memorySaveButton, false, "Save");
  if (open) {
    const editing = Boolean(editingMemoryId);
    if (memoryModalTitle) memoryModalTitle.textContent = editing ? "Edit memory" : "Add memory";
    if (memoryModalDetail) {
      memoryModalDetail.textContent = editing
        ? "Update this saved memory."
        : "Save a fact OpenArgos should remember across sessions.";
      setMemoryModalError("");
    }
    memoryInput.value = memory?.text ?? "";
    window.requestAnimationFrame(() => {
      memoryInput.focus();
      if (editing) memoryInput.setSelectionRange(memoryInput.value.length, memoryInput.value.length);
    });
  }
}

memoryAddButton?.addEventListener("click", () => setMemoryModal(true));
memoryCancelButtons.forEach((button) => button.addEventListener("click", () => setMemoryModal(false)));
memoryCaptureToggle?.addEventListener("change", () => {
  const enabled = memoryCaptureToggle.checked;
  setScopedStorageItem(memoryCaptureKey, String(enabled));
  renderMemoryCaptureState();
  window.openArgos?.upsertUserSettings?.({ memoryCaptureEnabled: enabled })?.catch?.(() => {});
});
memorySaveButton?.addEventListener("click", async () => {
  const text = memoryInput?.value.trim();
  if (!text) return;
  const memories = loadMemories();
  const originalLabel = memorySaveButton.textContent || "Save";
  setActionButtonLoading(memorySaveButton, true, "Saving");
  setMemoryModalError("");

  try {
    if (editingMemoryId) {
      const memory = memories.find((item) => item.id === editingMemoryId);
      if (!memory) throw new Error("Could not find that memory.");

      const result = isLocalMemoryId(editingMemoryId)
        ? await window.openArgos?.createMemory?.(text)
        : await window.openArgos?.updateMemory?.(editingMemoryId, text);
      if (!result?.ok || !result.memory) {
        throw new Error(result?.message || "Could not sync this memory.");
      }

      const nextMemories = memories.map((item) => item.id === editingMemoryId ? result.memory : item);
      saveMemories(nextMemories);
      setMemoryModal(false);
      renderMemories();
    } else {
      const result = await window.openArgos?.createMemory?.(text);
      if (!result?.ok || !result.memory) {
        throw new Error(result?.message || "Could not sync this memory.");
      }
      memories.unshift(result.memory);
      saveMemories(memories);
      setMemoryModal(false);
      renderMemories();
    }
  } catch (error) {
    setMemoryModalError(error?.message || "Could not sync this memory.");
  } finally {
    setActionButtonLoading(memorySaveButton, false, originalLabel);
  }
});

memoryResetButton?.addEventListener("click", async () => {
  const originalLabel = memoryResetButton.textContent || "Reset";
  setActionButtonLoading(memoryResetButton, true, "Resetting");
  setMemoryModal(false);
  saveMemories([]);
  renderMemories();
  try {
    await window.openArgos?.resetMemories?.();
  } catch {
    // Keep the local scoped cache as fallback.
  } finally {
    setActionButtonLoading(memoryResetButton, false, originalLabel);
  }
});

memoryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    memorySaveButton?.click();
  }
  if (event.key === "Escape") {
    setMemoryModal(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && memoryModal && !memoryModal.hidden) setMemoryModal(false);
});

renderMemoryCaptureState();
renderMemories();

if (modelMenu) document.body.append(modelMenu);
if (voiceModelMenu) document.body.append(voiceModelMenu);
if (computerUseEngineMenu) document.body.append(computerUseEngineMenu);
if (ambientSoundTypeMenu) document.body.append(ambientSoundTypeMenu);

function positionFixedMenu(trigger, menu, fallbackWidth = 248) {
  if (!trigger || !menu || menu.hidden) return;
  const rect = trigger.getBoundingClientRect();
  const width = menu.offsetWidth || fallbackWidth;
  const gap = 6;
  const margin = 14;
  const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
  const top = Math.min(rect.bottom + gap, window.innerHeight - menu.offsetHeight - margin);
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
}

function positionModelMenu() {
  positionFixedMenu(modelTrigger, modelMenu, 286);
}

function positionVoiceModelMenu() {
  positionFixedMenu(voiceModelTrigger, voiceModelMenu, 286);
}

function positionComputerUseEngineMenu() {
  positionFixedMenu(computerUseEngineTrigger, computerUseEngineMenu, 248);
}

function positionAmbientSoundTypeMenu() {
  positionFixedMenu(ambientSoundTypeTrigger, ambientSoundTypeMenu, 168);
}

function closeModelMenu() {
  if (modelMenu) modelMenu.hidden = true;
}

function closeVoiceModelMenu() {
  if (voiceModelMenu) voiceModelMenu.hidden = true;
}

function closeComputerUseEngineMenu() {
  if (computerUseEngineMenu) computerUseEngineMenu.hidden = true;
}

function closeAmbientSoundTypeMenu() {
  if (ambientSoundTypeMenu) ambientSoundTypeMenu.hidden = true;
}

function openModelMenu() {
  if (!modelMenu) return;
  closeVoiceModelMenu();
  closeComputerUseEngineMenu();
  closeAmbientSoundTypeMenu();
  modelMenu.hidden = false;
  positionModelMenu();
}

function openVoiceModelMenu() {
  if (!voiceModelMenu) return;
  closeModelMenu();
  closeComputerUseEngineMenu();
  closeAmbientSoundTypeMenu();
  voiceModelMenu.hidden = false;
  positionVoiceModelMenu();
}

function openComputerUseEngineMenu() {
  if (!computerUseEngineMenu) return;
  closeModelMenu();
  closeVoiceModelMenu();
  closeAmbientSoundTypeMenu();
  computerUseEngineMenu.hidden = false;
  positionComputerUseEngineMenu();
}

function openAmbientSoundTypeMenu() {
  if (!ambientSoundTypeMenu || ambientSoundTypeRow?.hidden) return;
  closeModelMenu();
  closeVoiceModelMenu();
  closeComputerUseEngineMenu();
  ambientSoundTypeMenu.hidden = false;
  positionAmbientSoundTypeMenu();
}

function setPrimaryModel(model, { syncLocal = true } = {}) {
  let option = getExactModelOption(model);
  if (!option || !modelIsAvailableForSource(option.dataset.modelOption)) {
    option = getExactModelOption(fallbackModelForSource(localModelState.source, model));
  }
  if (!option) {
    setScopedStorageItem(primaryModelKey, "");
    localModelState = {
      ...localModelState,
      provider: "",
      model: ""
    };
    renderModelOptions();
    renderSelectedModel("");
    renderModelKeyState();
    if (syncLocal) saveLocalModelState({ model: "", provider: "" });
    return;
  }
  const resolvedModel = option.dataset.modelOption;
  const provider = option.dataset.provider || "openai";
  setScopedStorageItem(primaryModelKey, resolvedModel);
  localModelState = {
    ...localModelState,
    provider,
    model: resolvedModel
  };
  renderModelOptions();
  renderSelectedModel(resolvedModel);
  renderLocalModelState();
  if (syncLocal) saveLocalModelState({ model: resolvedModel, provider });
}

modelTrigger?.addEventListener("click", () => {
  if (modelTrigger.disabled) return;
  if (!modelMenu) return;
  if (modelMenu.hidden) {
    openModelMenu();
  } else {
    closeModelMenu();
  }
});

voiceModelTrigger?.addEventListener("click", () => {
  if (voiceModelTrigger.disabled) return;
  if (!voiceModelMenu) return;
  if (voiceModelMenu.hidden) {
    openVoiceModelMenu();
  } else {
    closeVoiceModelMenu();
  }
});

computerUseEngineTrigger?.addEventListener("click", () => {
  if (!computerUseEngineMenu) return;
  if (computerUseEngineMenu.hidden) {
    openComputerUseEngineMenu();
  } else {
    closeComputerUseEngineMenu();
  }
});

computerUseEngineOptions.forEach((option) => {
  option.addEventListener("click", () => {
    void setComputerUseBackend(option.dataset.computerUseEngineOption);
    closeComputerUseEngineMenu();
  });
});

cuaKeyInput?.addEventListener("input", scheduleCuaKeySave);
cuaKeyInput?.addEventListener("blur", () => {
  window.clearTimeout(cuaKeySaveTimer);
  void saveCuaKey();
});
cuaKeyInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    cuaKeyInput.blur();
  }
});
cuaKeyRemove?.addEventListener("click", () => {
  window.clearTimeout(cuaKeySaveTimer);
  if (cuaKeyInput) {
    cuaKeyInput.value = "";
    cuaKeyInput.dataset.dirty = "true";
  }
  setByokStatus(cuaKeyStatus, "Removing...");
  void saveCuaKey();
});

newChatControl?.addEventListener("pointerenter", showNewChatDisabledTooltip);
newChatControl?.addEventListener("pointermove", positionNewChatDisabledTooltip);
newChatControl?.addEventListener("pointerleave", hideNewChatDisabledTooltip);
window.addEventListener("resize", positionNewChatDisabledTooltip);

ambientSoundTypeTrigger?.addEventListener("click", () => {
  if (!ambientSoundTypeMenu || ambientSoundTypeRow?.hidden) return;
  if (ambientSoundTypeMenu.hidden) {
    openAmbientSoundTypeMenu();
  } else {
    closeAmbientSoundTypeMenu();
  }
});

ambientSoundTypeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setAmbientSoundType(option.dataset.ambientSoundTypeOption, { preview: true });
    closeAmbientSoundTypeMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!modelSelect?.contains(event.target) && !modelMenu?.contains(event.target)) closeModelMenu();
  if (!voiceModelSelect?.contains(event.target) && !voiceModelMenu?.contains(event.target)) closeVoiceModelMenu();
  if (!computerUseEngineTrigger?.contains(event.target) && !computerUseEngineMenu?.contains(event.target)) closeComputerUseEngineMenu();
  if (!ambientSoundTypeSelect?.contains(event.target) && !ambientSoundTypeMenu?.contains(event.target)) closeAmbientSoundTypeMenu();
  if (!newMenuTrigger?.contains(event.target) && !newMenu?.contains(event.target)) closeNewMenu();
  if (!chatActionMenu?.contains(event.target) && !event.target.closest?.("[data-chat-actions-for]")) closeChatActionMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNewMenu();
    closeChatActionMenu();
    closeModelMenu();
    closeVoiceModelMenu();
    closeComputerUseEngineMenu();
    closeAmbientSoundTypeMenu();
  }
});

window.addEventListener("resize", () => {
  scheduleFloatingMenuPositionUpdate();
  scheduleChatSubtabsScrollStateUpdate();
});
document.addEventListener("scroll", () => {
  scheduleFloatingMenuPositionUpdate();
  scheduleChatSubtabsScrollStateUpdate();
}, { capture: true, passive: true });
chatSidebarGroup?.addEventListener("wheel", forwardChatSidebarWheel, { passive: false });
chatSubtabs?.addEventListener("scroll", scheduleChatSubtabsScrollStateUpdate, { passive: true });

setPrimaryModel(getScopedStorageItem(primaryModelKey) ?? "", { syncLocal: false });
updateAmbientSoundTypeVisibility();
renderAmbientSoundType();

accountToggle?.addEventListener("click", async () => {
  setProfileModal(true);
});
