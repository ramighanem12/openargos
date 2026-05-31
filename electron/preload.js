const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openArgos", {
  version: "0.1.0",
  openScreenRecordingSettings: () => ipcRenderer.invoke("settings:screen-recording"),
  openAccessibilitySettings: () => ipcRenderer.invoke("settings:accessibility"),
  requestNotifications: () => ipcRenderer.invoke("settings:notifications"),
  getPermissionStatus: (names) => ipcRenderer.invoke("settings:get-permissions", names),
  getLoginItem: () => ipcRenderer.invoke("settings:get-login-item"),
  setLoginItem: (openAtLogin) => ipcRenderer.invoke("settings:set-login-item", openAtLogin),
  relaunch: () => ipcRenderer.invoke("settings:relaunch"),
  previewAmbientSound: (type) => ipcRenderer.invoke("settings:ambient-sound-preview", type),
  getShortcuts: () => ipcRenderer.invoke("settings:shortcuts:get"),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke("settings:shortcuts:update", shortcuts),
  getMenuBarStatus: () => ipcRenderer.invoke("menu-bar:get"),
  setMenuBarVisible: (visible) => ipcRenderer.invoke("menu-bar:set-visible", visible),
  getWindowState: () => ipcRenderer.invoke("window:get-state"),
  getTheme: () => ipcRenderer.invoke("theme:get"),
  setTheme: (choice) => ipcRenderer.invoke("theme:set", choice),
  getLocalSession: () => ipcRenderer.invoke("local:session:get"),
  updateLocalProfile: (payload) => ipcRenderer.invoke("local:profile:update", payload),
  getUserSettings: () => ipcRenderer.invoke("local:user-settings:get"),
  upsertUserSettings: (settings) => ipcRenderer.invoke("local:user-settings:upsert", settings),
  getModelPolicy: () => ipcRenderer.invoke("model-policy:get"),
  updateModelPolicy: (policy) => ipcRenderer.invoke("model-policy:update", policy),
  getModelKeys: () => ipcRenderer.invoke("model-keys:get"),
  setModelKeyProvider: (provider) => ipcRenderer.invoke("model-keys:set-provider", provider),
  saveModelKey: (payload) => ipcRenderer.invoke("model-keys:save", payload),
  getComputerUseSettings: () => ipcRenderer.invoke("settings:computer-use:get"),
  setComputerUseBackend: (backend) => ipcRenderer.invoke("settings:computer-use:set-backend", backend),
  saveCuaKey: (key) => ipcRenderer.invoke("settings:computer-use:save-cua-key", key),
  getVoiceTranscriptionSettings: () => ipcRenderer.invoke("settings:voice-transcription:get"),
  setVoiceTranscriptionProvider: (provider) => ipcRenderer.invoke("settings:voice-transcription:set-provider", provider),
  onVoiceTranscriptionSettingsChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("settings:voice-transcription-changed", listener);
    return () => ipcRenderer.removeListener("settings:voice-transcription-changed", listener);
  },
  listMemories: () => ipcRenderer.invoke("memories:list"),
  createMemory: (text) => ipcRenderer.invoke("memories:create", text),
  updateMemory: (id, text) => ipcRenderer.invoke("memories:update", id, text),
  deleteMemory: (id) => ipcRenderer.invoke("memories:delete", id),
  resetMemories: () => ipcRenderer.invoke("memories:reset"),
  listAmbientHistory: (payload) => ipcRenderer.invoke("ambient:history:list", payload),
  searchAmbientHistory: (payload) => ipcRenderer.invoke("ambient:history:search", payload),
  renameAmbientSession: (payload) => ipcRenderer.invoke("ambient:history:rename", payload),
  deleteAmbientSession: (threadId) => ipcRenderer.invoke("ambient:history:delete", threadId),
  resumeAmbientSession: (threadId) => ipcRenderer.invoke("ambient:history:resume", threadId),
  openExternal: (url) => ipcRenderer.invoke("ambient:open-external", url),
  openAmbient: (payload) => ipcRenderer.invoke("ambient:open", payload),
  onThemeChange: (callback) => {
    ipcRenderer.on("theme:changed", (_event, theme) => callback(theme));
  },
  onShortcutsChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("settings:shortcuts-changed", listener);
    return () => ipcRenderer.removeListener("settings:shortcuts-changed", listener);
  },
  onNavigate: (callback) => {
    ipcRenderer.on("app:navigate", (_event, page) => callback(page));
  },
  onWindowStateChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  },
  onAmbientHistoryChanged: (callback) => {
    ipcRenderer.on("ambient:history-changed", (_event, payload) => callback(payload));
  },
  onMemoriesChanged: (callback) => {
    ipcRenderer.on("memories:changed", (_event, payload) => callback(payload));
  },
});
