const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("permissionHelper", {
  getState: () => ipcRenderer.invoke("permission-helper:get-state"),
  revealApp: () => ipcRenderer.invoke("permission-helper:reveal-app"),
  openSettings: () => ipcRenderer.invoke("permission-helper:open-settings"),
  close: () => ipcRenderer.invoke("permission-helper:close"),
  startAppDrag: () => ipcRenderer.send("permission-helper:start-app-drag"),
  onState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("permission-helper:state", listener);
    return () => ipcRenderer.removeListener("permission-helper:state", listener);
  }
});
