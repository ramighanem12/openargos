const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("computerOverlay", {
  stop: () => ipcRenderer.invoke("computer-overlay:stop"),
  onState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("computer-overlay:state", listener);
    return () => ipcRenderer.removeListener("computer-overlay:state", listener);
  }
});
