// Preload script runs in a privileged context before the renderer
// Use contextBridge to safely expose APIs to the renderer if needed
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  // Add any native APIs you want to expose here in future
});
