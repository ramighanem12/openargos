const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ambient", {
  resize: (height) => ipcRenderer.invoke("ambient:resize", height),
  focus: () => ipcRenderer.invoke("ambient:focus"),
  close: () => ipcRenderer.invoke("ambient:close"),
  openExternal: (url) => ipcRenderer.invoke("ambient:open-external", url),
  openLocalPath: (filePath) => ipcRenderer.invoke("ambient:open-local-path", filePath),
  copyText: (text) => ipcRenderer.invoke("ambient:copy-text", text),
  ask: (payload) => ipcRenderer.invoke("ambient:ask", payload),
  approveComputerUse: (payload) => ipcRenderer.invoke("ambient:computer-approve", payload),
  cancelComputerUse: (payload) => ipcRenderer.invoke("ambient:computer-cancel", payload),
  stopComputerUse: (payload) => ipcRenderer.invoke("ambient:computer-stop", payload),
  decideComputerCriticalAction: (payload) => ipcRenderer.invoke("ambient:computer-critical-decision", payload),
  listMentionSuggestions: () => ipcRenderer.invoke("ambient:mention-suggestions"),
  onAskStream: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("ambient:ask-stream", listener);
    return () => ipcRenderer.removeListener("ambient:ask-stream", listener);
  },
  onResumeSession: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("ambient:resume-session", listener);
    return () => ipcRenderer.removeListener("ambient:resume-session", listener);
  },
  onCommandCenter: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("ambient:command-center", listener);
    return () => ipcRenderer.removeListener("ambient:command-center", listener);
  },
  onVoiceShortcut: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("ambient:voice-shortcut", listener);
    return () => ipcRenderer.removeListener("ambient:voice-shortcut", listener);
  },
  onComputerStopShortcut: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("ambient:computer-stop-shortcut", listener);
    return () => ipcRenderer.removeListener("ambient:computer-stop-shortcut", listener);
  },
  transcribeVoice: (payload) => ipcRenderer.invoke("ambient:voice-transcribe", payload),
  pauseDictationMusic: () => ipcRenderer.invoke("ambient:dictation-music-pause"),
  resumeDictationMusic: () => ipcRenderer.invoke("ambient:dictation-music-resume"),
  startVoiceCapture: (payload) => ipcRenderer.invoke("ambient:voice-capture-start", payload),
  stopVoiceCapture: (payload) => ipcRenderer.invoke("ambient:voice-capture-stop", payload),
  voiceLog: (event, payload) => ipcRenderer.invoke("ambient:voice-log", { event, payload }),
  getVoiceTranscriptionSettings: () => ipcRenderer.invoke("settings:voice-transcription:get"),
  onVoiceTranscriptionSettingsChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("settings:voice-transcription-changed", listener);
    return () => ipcRenderer.removeListener("settings:voice-transcription-changed", listener);
  },
  getTheme: () => ipcRenderer.invoke("theme:get"),
  getShortcuts: () => ipcRenderer.invoke("settings:shortcuts:get"),
  onThemeChange: (callback) => {
    ipcRenderer.on("theme:changed", (_event, theme) => callback(theme));
  },
  onShortcutsChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("settings:shortcuts-changed", listener);
    return () => ipcRenderer.removeListener("settings:shortcuts-changed", listener);
  }
});
