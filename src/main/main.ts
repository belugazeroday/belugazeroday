import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
  Tray,
  Menu,
  nativeImage,
  screen,
} from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipcHandlers'
import { WindowManager } from './windowManager'

// ─── Dev check ────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Prevent multiple instances ───────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let windowManager: WindowManager
let tray: Tray | null = null

// ─── App ready ────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Disable hardware acceleration for better compatibility in overlays
  // app.disableHardwareAcceleration()

  windowManager = new WindowManager(isDev)
  await windowManager.createMainWindow()
  await windowManager.createOverlayWindow()

  setupIpcHandlers(windowManager)
  setupGlobalShortcuts(windowManager)
  setupTray(windowManager)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    } else {
      windowManager.mainWindow?.show()
    }
  })
})

// ─── Quit on all windows closed (except macOS) ────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ─── Second instance: focus main window ──────────────────────────────────────
app.on('second-instance', () => {
  windowManager?.mainWindow?.show()
  windowManager?.mainWindow?.focus()
})

// ─── Clean up shortcuts on quit ───────────────────────────────────────────────
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// ─── Global shortcuts ─────────────────────────────────────────────────────────
function setupGlobalShortcuts(wm: WindowManager) {
  // Default: Ctrl/Cmd+Shift+B to toggle overlay
  const registered = globalShortcut.register('CommandOrControl+Shift+B', () => {
    wm.toggleOverlay()
  })
  if (!registered) {
    console.warn('[Birdly] Failed to register global shortcut Ctrl+Shift+B')
  }
}

// ─── System tray ─────────────────────────────────────────────────────────────
function setupTray(wm: WindowManager) {
  try {
    // Use a simple text-based icon (empty for now, assets can be added later)
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Birdly — AI Performance Coach',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Show Dashboard',
        click: () => {
          wm.mainWindow?.show()
          wm.mainWindow?.focus()
        },
      },
      {
        label: 'Toggle Overlay (Ctrl+Shift+B)',
        click: () => wm.toggleOverlay(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ])

    tray.setToolTip('Birdly')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      wm.mainWindow?.show()
      wm.mainWindow?.focus()
    })
  } catch (err) {
    console.warn('[Birdly] Tray creation failed (no icon asset):', err)
  }
}

// ─── Open external links in browser ──────────────────────────────────────────
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
})
