const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { URL } = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('GateVortx starting...');

// Keep a global reference to prevent garbage collection
let mainWindow;

// ─── Auto-updater setup ───────────────────────────────────────────────────────
function setupAutoUpdater() {
  // Don't check in development
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;        // Download silently in background
  autoUpdater.autoInstallOnAppQuit = true; // Install when user quits

  // Check for updates on startup (after 3 seconds so the UI is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Update check failed:', err);
    });
  }, 3000);

  // Also check every 4 hours while app is running
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Periodic update check failed:', err);
    });
  }, 4 * 60 * 60 * 1000);

  // ── Updater events ────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    sendToRenderer('update-status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('App is up to date.');
    sendToRenderer('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download: ${Math.round(progress.percent)}%`);
    sendToRenderer('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    sendToRenderer('update-status', {
      status: 'downloaded',
      version: info.version,
    });
    // Show native dialog asking to restart
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `GateVortx ${info.version} has been downloaded.`,
      detail: 'Restart now to apply the update, or it will be applied next time you launch the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    sendToRenderer('update-status', { status: 'error', message: err.message });
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(err => log.error(err));
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── Window creation ──────────────────────────────────────────────────────────
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
    show: false,
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('https://gatevortx.lovable.app');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    setupAutoUpdater();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const appUrl = isDev
      ? 'https://gatevortx.lovable.app'
      : `file://${path.join(__dirname, '../dist')}`;
    if (!navigationUrl.startsWith(appUrl) && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
