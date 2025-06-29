const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getHistory: () => ipcRenderer.invoke("get-history"),
  onClipboardUpdate: (callback) =>
    ipcRenderer.on("update-clipboard", (_, data) => callback(data)),
});
