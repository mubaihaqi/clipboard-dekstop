const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getHistory: () => ipcRenderer.invoke("get-history"),
  onClipboardUpdate: (callback) =>
    ipcRenderer.on("update-clipboard", (_, data) => callback(data)),
  copyItem: (idx) => ipcRenderer.invoke("copy-item", idx),
  deleteItem: (idx) => ipcRenderer.invoke("delete-item", idx),
  togglePin: (idx) => ipcRenderer.invoke("toggle-pin", idx),
  moveItem: (idx, direction) => ipcRenderer.invoke("move-item", idx, direction),
});
