# GateVortx — Electron Desktop App

This folder contains the Electron main process files for building GateVortx as a Windows/Mac/Linux desktop app.

## Files

- `main.js` — Electron main process (creates BrowserWindow, handles app lifecycle)
- `preload.js` — Secure bridge between Node.js and the renderer

## How to Build

### 1. Install dependencies (first time only)
```bash
npm install
```

### 2. Run in development (loads the live deployed app)
```bash
npm run electron:dev
```

### 3. Build Windows installer (.exe)
```bash
npm run build
npm run electron:build
```
This produces a `dist-electron/` folder with:
- `GateVortx Setup x.x.x.exe` — NSIS installer for Windows

### 4. Build for all platforms
```bash
npm run electron:build -- --win --mac --linux
```

## Notes

- **Development mode** loads from `https://gatevortx.lovable.app` (live app)
- **Production mode** loads from the built `dist/` folder (local files)
- The app requires an internet connection for Supabase backend calls
