const {
  app,
  BrowserWindow,
  clipboard,
  nativeImage,
  Tray,
  Menu,
  ipcMain,
} = require("electron");
const path = require("path");
const fs = require("fs");

let win;
let tray;
let clipboardHistory = [];
let ignoreNextClipboardChange = false;

const HISTORY_FILE = path.join(__dirname, "history.json");

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  win.loadFile(path.join(__dirname, "renderer/index.html"));
}

function createTray() {
  tray = new Tray(path.join(__dirname, "assets/tray.png"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Clipboard", click: () => win.show() },
    { label: "Quit", role: "quit" },
  ]);
  tray.setToolTip("Clipboard Manager");
  tray.setContextMenu(contextMenu);
}

function watchClipboard() {
  let lastText = clipboard.readText();
  let lastImage = clipboard.readImage();

  setInterval(() => {
    const text = clipboard.readText();
    const image = clipboard.readImage();

    if (ignoreNextClipboardChange) {
      ignoreNextClipboardChange = false;
      lastText = text;
      lastImage = image;
      return;
    }

    if (text && text !== lastText) {
      lastText = text;
      clipboardHistory.unshift({
        type: "text",
        content: text,
        time: Date.now(),
      });
      saveHistory();
      win.webContents.send("update-clipboard", clipboardHistory);
    }

    if (!image.isEmpty() && image.toDataURL() !== lastImage.toDataURL()) {
      lastImage = image;
      const fileName = `image-${Date.now()}.png`;
      const filePath = path.join(__dirname, "assets", fileName);
      fs.writeFileSync(filePath, image.toPNG());

      clipboardHistory.unshift({
        type: "image",
        content: filePath,
        time: Date.now(),
      });
      saveHistory();
      win.webContents.send("update-clipboard", clipboardHistory);
    }
  }, 1000);
}

function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(clipboardHistory.slice(0, 20)));
}

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    clipboardHistory = JSON.parse(fs.readFileSync(HISTORY_FILE));
  }
}

app.whenReady().then(() => {
  loadHistory();
  createWindow();
  createTray();
  watchClipboard();
});

ipcMain.handle("get-history", () => clipboardHistory);

ipcMain.handle("copy-item", (event, idx) => {
  const item = clipboardHistory[idx];
  if (!item) return;
  ignoreNextClipboardChange = true;
  if (item.type === "text") {
    clipboard.writeText(item.content);
  } else if (item.type === "image") {
    const image = nativeImage.createFromPath(item.content);
    clipboard.writeImage(image);
  }
});

ipcMain.handle("delete-item", (event, idx) => {
  if (clipboardHistory[idx]) {
    clipboardHistory.splice(idx, 1);
    saveHistory();
    win.webContents.send("update-clipboard", clipboardHistory);
  }
});

ipcMain.handle("toggle-pin", (event, idx) => {
  const item = clipboardHistory[idx];
  if (!item) return;
  item.pinned = !item.pinned;
  // Pinned items stay at the top
  clipboardHistory = [
    ...clipboardHistory.filter((i) => i.pinned),
    ...clipboardHistory.filter((i) => !i.pinned),
  ];
  saveHistory();
  win.webContents.send("update-clipboard", clipboardHistory);
});

ipcMain.handle("move-item", (event, idx, direction) => {
  if (
    (direction === "up" && idx === 0) ||
    (direction === "down" && idx === clipboardHistory.length - 1)
  ) {
    return;
  }
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  [clipboardHistory[idx], clipboardHistory[swapIdx]] = [
    clipboardHistory[swapIdx],
    clipboardHistory[idx],
  ];
  saveHistory();
  win.webContents.send("update-clipboard", clipboardHistory);
});

app.on("window-all-closed", (e) => e.preventDefault());
