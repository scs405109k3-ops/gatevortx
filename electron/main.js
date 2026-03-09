const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { URL } = require('url');

// Keep a global reference to prevent garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    title: 'GateVortx',
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    backgroundColor: '#0f172a',
    show: false, // Don't show until ready to prevent white flash
    titleBarStyle: 'default',
    autoHideMenuBar: true,  // Hide the default menu bar for cleaner look
  });

  // Load the app
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development: load from Vite dev server or production URL
    mainWindow.loadURL('https://gatevortx.lovable.app');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production: load built local files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in the default browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const appUrl = isDev
      ? 'https://gatevortx.lovable.app'
      : `file://${path.join(__dirname, '../dist')}`;
    // Allow navigation within the app, open external links in browser
    if (!navigationUrl.startsWith(appUrl) && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows/Linux, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
