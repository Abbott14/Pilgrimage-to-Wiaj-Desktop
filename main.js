const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

let mainWindow;

// ==============================================================================
// WINDOW CREATION
// ==============================================================================

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 650,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  // Set user agent to avoid detection issues
  mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Load the index.html of the app
  mainWindow.loadFile('src/renderer/index.html');

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Create application menu
  createMenu();

  // Handle window closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// ==============================================================================
// MENU SYSTEM - Easy to customize!
// ==============================================================================
//
// To add a new menu item:
// 1. Add it to the appropriate submenu array below
// 2. Define the action in the click handler
// 3. Optionally add a keyboard shortcut with 'accelerator'
//
// Common accelerator patterns:
// - 'CmdOrCtrl+Q' = Cmd on Mac, Ctrl on Windows/Linux
// - 'F11' = Function key
// - 'Alt+Enter' = Alt + Enter
// ==============================================================================

function createMenu() {
  const template = [
    // ========================================
    // FILE MENU
    // ========================================
    {
      label: 'File',
      submenu: [
        {
          label: 'Restart Game',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },

    // ========================================
    // GAME MENU
    // ========================================
    {
      label: 'Game',
      submenu: [
        {
          label: 'Refresh Game',
          accelerator: 'F5',
          click: () => {
            mainWindow.webContents.send('game-refresh');
            mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Mute Audio',
          accelerator: 'CmdOrCtrl+M',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            // Send mute state to renderer
            mainWindow.webContents.send('toggle-mute', menuItem.checked);
          }
        },
        { type: 'separator' },
        {
          label: 'Screenshot',
          accelerator: 'F12',
          click: () => {
            takeScreenshot();
          }
        }
      ]
    },

    // ========================================
    // VIEW MENU
    // ========================================
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomIn'
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut'
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          role: 'forceReload'
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          role: 'toggleDevTools'
        }
      ]
    },

    // ========================================
    // WINDOW MENU
    // ========================================
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow.setAlwaysOnTop(menuItem.checked);
          }
        }
      ]
    },

    // ========================================
    // HELP MENU
    // ========================================
    {
      label: 'Help',
      submenu: [
        {
          label: 'Game Controls',
          click: () => {
            showControlsDialog();
          }
        },
        {
          label: 'Visit Flowlab.io',
          click: () => {
            shell.openExternal('https://flowlab.io');
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/yourusername/pilgrimage-to-wiaj/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            showAboutDialog();
          }
        }
      ]
    }
  ];

  // Build and set the menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==============================================================================
// MENU HELPER FUNCTIONS
// ==============================================================================

/**
 * Take a screenshot of the game
 */
function takeScreenshot() {
  const { dialog } = require('electron');
  const fs = require('fs');

  mainWindow.webContents.capturePage().then(image => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pilgrimage-screenshot-${timestamp}.png`;

    dialog.showSaveDialog(mainWindow, {
      title: 'Save Screenshot',
      defaultPath: filename,
      filters: [
        { name: 'Images', extensions: ['png'] }
      ]
    }).then(result => {
      if (!result.canceled && result.filePath) {
        fs.writeFile(result.filePath, image.toPNG(), (err) => {
          if (err) {
            dialog.showErrorBox('Screenshot Error', 'Failed to save screenshot: ' + err.message);
          } else {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Screenshot Saved',
              message: 'Screenshot saved successfully!',
              detail: result.filePath
            });
          }
        });
      }
    });
  });
}

/**
 * Show the About dialog
 */
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Pilgrimage to Wiaj',
    message: 'The New Pilgrimage to Wiaj',
    detail: 'Desktop Edition\n' +
            'Version 1.0.0\n\n' +
            'Original game created with Flowlab.io\n' +
            'Desktop port using Electron\n\n' +
            '© 2025 - Pilgrimage to Wiaj'
  });
}

/**
 * Show the game controls dialog
 */
function showControlsDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Game Controls',
    message: 'How to Play',
    detail: 'Arrow Keys - Move character\n' +
            'Space - Jump/Interact\n' +
            'Enter - Confirm\n' +
            'ESC - Pause/Menu\n\n' +
            'Desktop Controls:\n' +
            'F11 - Fullscreen\n' +
            'F12 - Screenshot\n' +
            'Ctrl+M - Mute Audio\n' +
            'Ctrl+R - Restart Game'
  });
}

// ==============================================================================
// APP LIFECYCLE
// ==============================================================================

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS, re-create a window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // On macOS, apps stay active until user quits with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

// Handle potential crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
