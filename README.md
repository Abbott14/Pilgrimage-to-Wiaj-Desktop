# Pilgrimage to Wiaj - Desktop Edition

Desktop version of "The New Pilgrimage to Wiaj" game, originally created on Flowlab.io.

## About

This is a fully self-contained Electron-based desktop application that wraps the Flowlab game engine. All dependencies are bundled locally - no external services required (except for game asset loading from Flowlab servers).

## Features

- **Cross-platform:** Runs on Windows, macOS, and Linux
- **Offline-ready:** All code dependencies bundled locally
- **Native desktop experience:** Window management, menus, keyboard shortcuts
- **Fullscreen support:** Press F11 to toggle fullscreen mode
- **Developer tools:** Access via View menu or Ctrl+Shift+I (Cmd+Option+I on macOS)

## Requirements

- Node.js 16.x or higher
- npm 8.x or higher

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd Pilgrimage-to-Wiaj-Desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

To start the game in development mode:

```bash
npm start
```

## Building for Distribution

Build installers for all platforms:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

Built applications will be in the `dist/` directory.

## Project Structure

```
Pilgrimage-to-Wiaj-Desktop/
├── main.js                 # Electron main process
├── package.json            # Project configuration
├── README.md              # This file
├── CLAUDE.md              # Technical documentation
├── PLAN.md                # Development plan
│
├── src/
│   ├── renderer/
│   │   └── index.html     # Game window
│   │
│   └── scripts/           # All game libraries (bundled locally)
│       ├── flowlab-engine-5000.js    # Main game engine
│       ├── flowAudio.js              # Audio system
│       ├── jquery-1.8.3.min.js       # jQuery
│       ├── pubnub.4.21.2.js          # Multiplayer support
│       ├── rtc-pubnub.js             # WebRTC adapter
│       └── rtc-xirsys.js             # TURN/STUN support
│
└── assets/                # Game assets (icons, etc.)
```

## Technical Details

- **Game Engine:** OpenFL/Lime (Haxe-compiled to JavaScript)
- **Canvas Size:** 384×384 pixels
- **Audio:** Howler.js with custom FlowAudio wrapper (32 concurrent sounds max)
- **Multiplayer:** PubNub + WebRTC (optional)
- **Framework:** Electron 28.x

## Controls

The game uses standard keyboard and mouse controls. Specific controls depend on the game implementation.

Common shortcuts:
- **F11:** Toggle fullscreen
- **Ctrl+R (Cmd+R):** Reload game
- **Ctrl+Shift+I (Cmd+Option+I):** Open DevTools
- **Ctrl+Q (Cmd+Q):** Quit application

## Known Limitations

- Game assets are loaded from Flowlab.io servers (requires internet connection)
- Some features may require Cloudflare challenges to be solved

## Development

For detailed technical documentation, see:
- **CLAUDE.md** - Comprehensive code documentation and architecture
- **PLAN.md** - Development roadmap and conversion strategy

## License

Game content is created with Flowlab.io. This desktop wrapper is provided as-is.

## Credits

- Original game created on Flowlab.io
- Desktop conversion using Electron
- Audio system powered by Howler.js
