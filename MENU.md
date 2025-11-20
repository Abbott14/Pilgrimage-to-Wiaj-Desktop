# Menu Customization Guide

This guide shows you how to easily customize the application menu in `main.js`.

## Quick Start

The menu is defined in the `createMenu()` function in `main.js` starting at line 62.

## Menu Structure

```
File
├── Restart Game (Ctrl+R)
├── New Window (Ctrl+N)
└── Exit (Ctrl+Q)

Game
├── Refresh Game (F5)
├── Mute Audio (Ctrl+M)
└── Screenshot (F12)

View
├── Toggle Fullscreen (F11)
├── Zoom In (Ctrl++)
├── Zoom Out (Ctrl+-)
├── Reset Zoom (Ctrl+0)
├── Reload (Ctrl+Shift+R)
└── Toggle Developer Tools (Ctrl+Shift+I)

Window
├── Minimize
├── Close (Ctrl+W)
└── Always on Top (checkbox)

Help
├── Game Controls
├── Visit Flowlab.io
├── Report Issue
└── About
```

## How to Add a Menu Item

### 1. Basic Menu Item

```javascript
{
  label: 'My Action',
  click: () => {
    // Your code here
  }
}
```

### 2. Menu Item with Keyboard Shortcut

```javascript
{
  label: 'My Action',
  accelerator: 'CmdOrCtrl+K',  // Ctrl+K on Windows/Linux, Cmd+K on Mac
  click: () => {
    // Your code here
  }
}
```

### 3. Checkbox Menu Item

```javascript
{
  label: 'Toggle Feature',
  type: 'checkbox',
  checked: false,
  click: (menuItem) => {
    console.log('Checked:', menuItem.checked);
    // Your code here
  }
}
```

### 4. Separator

```javascript
{ type: 'separator' }
```

## Common Keyboard Shortcuts

| Pattern | Description |
|---------|-------------|
| `'F11'` | Function key |
| `'CmdOrCtrl+Q'` | Cmd on Mac, Ctrl on Windows/Linux |
| `'CmdOrCtrl+Shift+I'` | Cmd+Shift on Mac, Ctrl+Shift on Windows/Linux |
| `'Alt+Enter'` | Alt + Enter |
| `'Space'` | Spacebar |

## Built-in Roles

Electron provides built-in roles for common actions:

```javascript
{ role: 'minimize' }      // Minimize window
{ role: 'close' }         // Close window
{ role: 'quit' }          // Quit application
{ role: 'reload' }        // Reload page
{ role: 'forceReload' }   // Force reload
{ role: 'toggleDevTools' } // Toggle dev tools
{ role: 'zoomIn' }        // Zoom in
{ role: 'zoomOut' }       // Zoom out
{ role: 'resetZoom' }     // Reset zoom
```

## Example: Adding a "Save Game" Feature

1. Find the **Game** menu section in `main.js` (around line 98)
2. Add your menu item:

```javascript
{
  label: 'Game',
  submenu: [
    {
      label: 'Refresh Game',
      accelerator: 'F5',
      click: () => {
        mainWindow.reload();
      }
    },
    // ADD THIS:
    {
      label: 'Save Game',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        // Send save command to the game
        mainWindow.webContents.send('save-game');
      }
    },
    { type: 'separator' },
    // ... rest of menu
  ]
}
```

3. Add a listener in `src/renderer/index.html` (around line 110):

```javascript
// Listen for save game command
ipcRenderer.on('save-game', () => {
  console.log('Saving game...');
  // Your save game code here
});
```

## Communicating with the Renderer

To send commands from menu to the game, use:

```javascript
mainWindow.webContents.send('your-event-name', data);
```

Then in `src/renderer/index.html`, listen for it:

```javascript
ipcRenderer.on('your-event-name', (event, data) => {
  // Handle the event
});
```

## Helper Functions

The following helper functions are available:

### `takeScreenshot()`
Captures the current game screen and saves it as PNG.

### `showAboutDialog()`
Shows the About dialog with game information.

### `showControlsDialog()`
Shows the game controls help dialog.

## Tips

1. **Test your changes**: Restart the app with `npm start` after modifying the menu
2. **Check console**: Use `console.log()` to debug menu actions
3. **Follow the pattern**: Look at existing menu items for examples
4. **Keep it organized**: Add comments to explain custom menu items
5. **Avoid conflicts**: Make sure keyboard shortcuts don't conflict

## Common Tasks

### Change a Label
```javascript
label: 'My New Label',  // Just change the text
```

### Change a Shortcut
```javascript
accelerator: 'F9',  // Change to any valid key combination
```

### Remove a Menu Item
Simply delete or comment out the entire menu item object.

### Reorder Menu Items
Cut and paste menu items within their submenu array.

### Add a New Top-Level Menu
Add a new object to the `template` array:

```javascript
const template = [
  // ... existing menus ...
  {
    label: 'My Menu',
    submenu: [
      // Your items here
    ]
  }
];
```

## Need More Help?

- Electron Menu Documentation: https://www.electronjs.org/docs/api/menu
- Keyboard Accelerators: https://www.electronjs.org/docs/api/accelerator
- IPC Communication: https://www.electronjs.org/docs/api/ipc-renderer

## Quick Reference Location

All menu code is in: `/main.js`
- Line 62: `createMenu()` function starts
- Line 63-236: Menu template definition
- Line 250-317: Helper functions
