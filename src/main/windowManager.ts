import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/types'

const RENDERER_DEV_URL = 'http://localhost:5173'
const OVERLAY_DEV_URL = 'http://localhost:5174'

export class WindowManager {
  mainWindow: BrowserWindow | null = null
  overlayWindow: BrowserWindow | null = null
  private overlayVisible = false
  private isDev: boolean

  constructor(isDev: boolean) {
    this.isDev = isDev
  }

  // ─── Main Dashboard Window ──────────────────────────────────────────────────
  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#0a0a0a',
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        sandbox: false,
      },
      icon: undefined,
    })

    // Load content
    if (this.isDev) {
      await this.mainWindow.loadURL(RENDERER_DEV_URL)
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const validUrls = [RENDERER_DEV_URL, 'file://']
      if (!validUrls.some((u) => url.startsWith(u))) {
        event.preventDefault()
      }
    })
  }

  // ─── Stealth Overlay Window ─────────────────────────────────────────────────
  async createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    this.overlayWindow = new BrowserWindow({
      width: 380,
      height: 600,
      x: width - 400,
      y: 20,
      show: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      focusable: true,
      // Stealth: excluded from window capturing APIs
      type: process.platform === 'darwin' ? 'panel' : 'toolbar',
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        sandbox: false,
      },
    })

    // ── Stealth settings (Cluely-level) ──────────────────────────────────────
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Content protection: hide from screen capture / sharing
    this.overlayWindow.setContentProtection(true)

    // Load overlay content
    if (this.isDev) {
      await this.overlayWindow.loadURL(OVERLAY_DEV_URL)
    } else {
      await this.overlayWindow.loadFile(join(__dirname, '../overlay/index.html'))
    }

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null
    })
  }

  // ─── Toggle overlay visibility ──────────────────────────────────────────────
  toggleOverlay() {
    if (!this.overlayWindow) return

    this.overlayVisible = !this.overlayVisible

    if (this.overlayVisible) {
      this.overlayWindow.show()
      this.overlayWindow.setIgnoreMouseEvents(false)
    } else {
      this.overlayWindow.hide()
    }

    // Notify both windows
    this.mainWindow?.webContents.send(IPC.OVERLAY_VISIBLE, this.overlayVisible)
    this.overlayWindow?.webContents.send(IPC.OVERLAY_VISIBLE, this.overlayVisible)
  }

  showOverlay() {
    if (!this.overlayWindow) return
    this.overlayVisible = true
    this.overlayWindow.show()
    this.mainWindow?.webContents.send(IPC.OVERLAY_VISIBLE, true)
    this.overlayWindow.webContents.send(IPC.OVERLAY_VISIBLE, true)
  }

  hideOverlay() {
    if (!this.overlayWindow) return
    this.overlayVisible = false
    this.overlayWindow.hide()
    this.mainWindow?.webContents.send(IPC.OVERLAY_VISIBLE, false)
    this.overlayWindow?.webContents.send(IPC.OVERLAY_VISIBLE, false)
  }

  setOverlayIgnoreMouse(ignore: boolean) {
    this.overlayWindow?.setIgnoreMouseEvents(ignore, { forward: true })
  }

  isOverlayVisible() {
    return this.overlayVisible
  }

  sendToOverlay(channel: string, ...args: unknown[]) {
    this.overlayWindow?.webContents.send(channel, ...args)
  }

  sendToMain(channel: string, ...args: unknown[]) {
    this.mainWindow?.webContents.send(channel, ...args)
  }
}
