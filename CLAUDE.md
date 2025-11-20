# Pilgrimage to Wiaj - Desktop Edition

## Project Documentation for AI Assistants

This document provides comprehensive technical information about the codebase for AI assistants working on this project.

## Project Overview

This is an Electron-based desktop application wrapper for "The New Pilgrimage to Wiaj," a game originally created on Flowlab.io. The goal is to convert the web-based game into a standalone desktop application that can run on Windows, macOS, and Linux.

### Game Information
- **Title:** The New Pilgrimage to Wiaj
- **Original Platform:** Flowlab.io (https://flowlab.io/game/embed/2687779)
- **Game ID:** 2687779
- **Canvas Resolution:** 384x384 pixels
- **Engine:** OpenFL/Lime (Haxe-compiled JavaScript)

## Architecture

### Technology Stack

#### Frontend
- **Electron:** Desktop application framework (Node.js + Chromium)
- **OpenFL/Lime:** Game framework (cross-compiled from Haxe)
- **HTML5 Canvas:** Rendering surface
- **jQuery 1.8.3:** DOM manipulation (legacy dependency)

#### Audio System
- **Howler.js:** HTML5 audio library
- **FlowAudio.js:** Custom wrapper around Howler.js
  - Manages audio pool (max 32 concurrent sounds)
  - Handles play, pause, stop, volume, pan
  - Supports audio overlap and looping

#### Multiplayer (Optional)
- **PubNub SDK v4.21.2:** Real-time messaging
- **WebRTC:** Peer-to-peer connections
- **Xirsys:** TURN/STUN server provider

### Component Structure

```
┌─────────────────────────────────────────┐
│           Electron Main Process          │
│  - Window management                     │
│  - App lifecycle                         │
│  - Menu bar                              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        Electron Renderer Process         │
│  - HTML5 Canvas                          │
│  - Game loop                             │
│  - Input handling                        │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│  Flowlab Engine  │  │  FlowAudio.js    │
│  (OpenFL/Lime)   │  │  (Howler.js)     │
└──────────────────┘  └──────────────────┘
        │                       │
        ▼                       ▼
┌──────────────────────────────────────────┐
│           External Resources              │
│  - Game data (JSON)                       │
│  - Sprites/Images                         │
│  - Sound effects                          │
│  - Music                                  │
└──────────────────────────────────────────┘
```

## File Structure

### Current Structure
```
/home/user/Pilgrimage-to-Wiaj-Desktop/
├── .git/                      # Git repository
├── game_embed.html            # Original Flowlab embed page
├── PLAN.md                    # Conversion roadmap
├── CLAUDE.md                  # This file
│
├── assets/                    # Game assets (to be populated)
│   └── (empty - will contain game data)
│
└── src/
    └── scripts/               # JavaScript libraries
        ├── flowlab-engine-5000.js  # Main game engine (8.5MB)
        ├── flowAudio.js            # Audio system wrapper
        ├── jquery-1.8.3.min.js     # jQuery library
        ├── rtc-pubnub.js           # PubNub RTC adapter
        └── rtc-xirsys.js           # Xirsys RTC adapter
```

### Planned Structure (After Electron Setup)
```
Pilgrimage-to-Wiaj-Desktop/
├── main.js                    # Electron main process
├── preload.js                 # Preload script (security bridge)
├── package.json               # NPM configuration
├── package-lock.json          # Dependency lock
├── README.md                  # User documentation
├── CLAUDE.md                  # This file
├── PLAN.md                    # Development plan
│
├── assets/
│   ├── icons/                 # Application icons
│   │   ├── icon.png           # PNG icon (512x512)
│   │   ├── icon.ico           # Windows icon
│   │   └── icon.icns          # macOS icon
│   └── game-data/             # Game assets (if bundled)
│
├── src/
│   ├── renderer/
│   │   ├── index.html         # Main game window
│   │   ├── renderer.js        # Renderer process logic
│   │   └── styles/
│   │       └── app.css        # Application styles
│   │
│   └── scripts/               # Game libraries (current)
│       ├── flowlab-engine-5000.js
│       ├── flowAudio.js
│       ├── jquery-1.8.3.min.js
│       ├── rtc-pubnub.js
│       └── rtc-xirsys.js
│
├── build/                     # electron-builder config
│   └── icons/                 # Platform-specific icons
│
└── dist/                      # Built applications (gitignored)
```

## Code Analysis

### 1. Flowlab Engine (flowlab-engine-5000.js)

**Location:** `src/scripts/flowlab-engine-5000.js`
**Size:** 8.5 MB (minified)
**Language:** JavaScript (cross-compiled from Haxe)

#### Key Components:
- **Lime Framework:** OpenFL's cross-platform layer
- **HTML5 Backend:** Canvas rendering, input handling
- **Game Loop:** Fixed timestep update loop
- **Asset Management:** Dynamic loading of sprites, sounds, data
- **Input System:** Keyboard, mouse, touch support

#### Entry Point:
```javascript
lime.embed("Flowlab", "builder", 0, 0, {
  rootPath: "/html5/bin",
  parameters: {
    game: "2687779",
    asset_root: 'assets2',
    uid: "",
    mode: "embed",
    viewW: "384.0",
    viewH: "384.0"
  }
});
```

#### Important Classes:
- `lime_app_Module` - Base application module
- `lime__$internal_backend_html5_HTML5Application` - HTML5 app implementation
- `lime_media_AudioManager` - Audio initialization
- `lime_system_Sensor` - Accelerometer support

### 2. FlowAudio.js (Audio System)

**Location:** `src/scripts/flowAudio.js`
**Dependencies:** Howler.js (external)
**Size:** 13 KB

#### Class: `FlowAudio`

**Purpose:** Manages all game audio through a pooled system to avoid browser limitations.

#### Key Features:
- **Audio Pool:** Maximum 32 concurrent Howler instances (Chrome limitation)
- **Sound Management:** Play, pause, stop, volume, pan control
- **Overlap Support:** Multiple instances of same sound
- **Preview Mode:** Special handling for audio previews in editor
- **Pause/Resume:** Global audio control

#### Important Methods:

**`play2({url, volume, loop, force, doneCallback, startCallback, position, pan, html, overlap, soundId, nopause})`**
- Main audio playback function
- Parameters:
  - `url`: Audio file URL
  - `volume`: 0-1 (normalized)
  - `loop`: Boolean for looping
  - `force`: Play even when game paused
  - `position`: Start position in seconds
  - `pan`: -1 (left) to 1 (right)
  - `overlap`: Allow multiple instances
  - `soundId`: Resume specific sound
  - `nopause`: Prevent pausing this sound

**`pauseAll()` / `resumeAll()`**
- Global audio control
- Respects `nopause` flag

**`stop(url, soundId)`**
- Stops specific sound or all instances

**Pool Management:**
- When pool is full (32 sounds), finds inactive sound and replaces it
- Unloads old Howler instances to free memory
- Logs "Audio Pool Overflow" warning

#### Browser Compatibility:
- Uses HTML5 audio mode for instant playback
- Handles autoplay restrictions with unlock events
- Graceful error handling for load/play failures

### 3. Game Embed Structure (game_embed.html)

**Location:** `./game_embed.html`

#### HTML Structure:
```html
<div id="game" class="center">
  <div id="builder" class="center"></div>
</div>
```

#### Key Scripts Loaded:
1. jQuery 1.8.3
2. PubNub SDK 4.21.2 (CDN)
3. RTC adapters (PubNub, Xirsys)
4. FlowAudio.js
5. Flowlab Engine (from releases.flowlab.io)

#### JavaScript Initialization:
- Prevents touch scrolling
- Adjusts viewport for high DPI displays
- Disables backspace navigation
- Initializes FlowAudio instance
- Sets up cursor toggle system
- Initializes RTC for multiplayer

#### CSS Styling:
- Black background (#000000)
- Fixed 384x384 canvas size
- Custom fonts: D-DIN, Whitney-Book
- Centered layout

### 4. RTC Libraries (Multiplayer)

#### rtc-pubnub.js (8KB)
- WebRTC adapter for PubNub signaling
- Handles peer discovery and connection
- Room-based multiplayer

#### rtc-xirsys.js (19KB)
- Xirsys TURN/STUN server integration
- ICE candidate exchange
- NAT traversal support

**Note:** These are optional for single-player desktop version.

## External Dependencies

### Runtime Dependencies (Required)
1. **Howler.js** (Not yet installed)
   - npm: `howler@^2.2.3`
   - Purpose: HTML5 audio playback
   - Used by: FlowAudio.js

2. **PubNub SDK** (Optional - for multiplayer)
   - CDN: `https://cdn.pubnub.com/sdk/javascript/pubnub.4.21.2.js`
   - Purpose: Real-time messaging
   - Used by: rtc-pubnub.js

### Development Dependencies (To be installed)
1. **Electron**
   - npm: `electron@latest`
   - Purpose: Desktop app framework

2. **electron-builder**
   - npm: `electron-builder`
   - Purpose: Building and packaging

### Bundled Libraries
- jQuery 1.8.3 (already downloaded)
- Flowlab Engine v5000 (already downloaded)
- FlowAudio.js (already downloaded)
- RTC adapters (already downloaded)

## Game Assets

### Asset Loading Strategy

The Flowlab engine loads assets dynamically at runtime from:
```
https://flowlab.io/html5/bin/assets2/data/{gameId}/data.json
```

#### data.json Structure:
Contains:
- Game objects and their properties
- Behavior scripts
- Level layouts
- Asset references (sprites, sounds)

#### Asset Types:
1. **Sprites/Images**
   - Format: PNG, JPG
   - Location: `assets2/` directory
   - Loaded on-demand

2. **Audio Files**
   - Format: MP3, OGG, WAV
   - Location: `assets2/` directory
   - Preloaded or streamed

3. **Fonts**
   - D-DIN (headings)
   - Whitney-Book (body text)
   - Location: `/html5/bin/assets/`

### Asset Management Challenges

1. **Cloudflare Protection**
   - Direct downloads blocked
   - Requires browser-like requests
   - May need runtime loading

2. **Path Resolution**
   - Assets referenced as relative paths
   - Need to maintain path structure or remap

3. **Size Considerations**
   - Full asset download may be large
   - Consider selective bundling
   - Implement caching for online assets

## Configuration Parameters

### Game Configuration (from embed)
```javascript
{
  rootPath: "/html5/bin",           // Asset root
  parameters: {
    auth_token: "",                  // User authentication
    game: "2687779",                 // Game ID
    asset_root: 'assets2',           // Asset subdirectory
    splash: "",                      // Splash screen image
    splash_bg: null,                 // Splash background color
    splash_bar: null,                // Loading bar color
    splash_logo: false,              // Show Flowlab logo
    uid: "",                         // User ID
    mode: "embed",                   // Game mode
    chrome: !!window.chrome,         // Browser detection
    membership: "",                  // User membership level
    send_events: false,              // Analytics
    viewW: "384.0",                  // Viewport width
    viewH: "384.0"                   // Viewport height
  }
}
```

### Electron Configuration (to be implemented)
```javascript
{
  window: {
    width: 800,                      // Window width
    height: 600,                     // Window height
    minWidth: 600,                   // Minimum width
    minHeight: 500,                  // Minimum height
    resizable: true,                 // Allow resizing
    fullscreenable: true,            // Allow fullscreen
    webPreferences: {
      nodeIntegration: false,        // Security
      contextIsolation: true,        // Security
      preload: "./preload.js"        // Preload script
    }
  }
}
```

## Security Considerations

### Current State
- Game loads external resources from flowlab.io
- Uses CDN for PubNub SDK
- No authentication required for embed mode

### Electron Security Best Practices
1. **Context Isolation:** Enable to separate renderer from main process
2. **Node Integration:** Disable in renderer for security
3. **Preload Script:** Use for controlled API exposure
4. **CSP:** Configure Content Security Policy
5. **External Resources:** Validate and sanitize

### Potential Issues
1. **CORS:** May need to disable web security in dev mode
2. **External Scripts:** Consider bundling for offline use
3. **WebRTC:** Requires network permissions

## Performance Considerations

### Current Performance Characteristics
- **Engine Size:** 8.5 MB (minified JavaScript)
- **Canvas Resolution:** 384x384 (relatively small)
- **Audio Pool:** 32 concurrent sounds maximum
- **Frame Rate:** 60 FPS target

### Optimization Opportunities
1. **Hardware Acceleration:** Ensure enabled in Electron
2. **Audio Preloading:** Preload frequently used sounds
3. **Asset Caching:** Cache downloaded assets locally
4. **Memory Management:** Monitor audio pool usage
5. **V8 Optimization:** Use latest Electron/Chromium

### Potential Bottlenecks
1. **Network Latency:** If loading assets remotely
2. **Audio Pool Overflow:** Too many concurrent sounds
3. **Canvas Rendering:** If scaled up significantly
4. **Memory Leaks:** Watch Howler instance cleanup

## Development Workflow

### Git Workflow
- **Branch:** `claude/flowlab-to-electron-01BNED6bNeQCuSCzGngAhz8m`
- **Remote:** `origin` (GitHub)
- **Main Branch:** (to be determined)

### Development Commands (To be set up)
```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for all platforms
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux

# Run tests
npm test
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Game loads and displays correctly
- [ ] Mouse input works
- [ ] Keyboard input works (arrow keys, spacebar, etc.)
- [ ] Audio plays without errors
- [ ] Multiple sounds can play simultaneously
- [ ] Game logic executes correctly
- [ ] Window can be resized
- [ ] Fullscreen mode works
- [ ] App quits cleanly

### Automated Testing (Future)
- Unit tests for custom code
- Integration tests for Electron
- End-to-end testing with Spectron

## Known Issues & Limitations

### Current Limitations
1. **Asset Access:** Game data requires internet connection
2. **Cloudflare Protection:** Some resources blocked from direct download
3. **jQuery Version:** Using old 1.8.3 (security concerns)
4. **No Offline Mode:** Currently requires flowlab.io access

### Potential Issues
1. **CORS Errors:** When loading external resources
2. **Audio Context:** May require user interaction to start
3. **WebRTC:** May require firewall configuration
4. **Platform Differences:** macOS, Windows, Linux behavior

## Next Development Steps

See PLAN.md for detailed roadmap. Immediate next steps:

1. **Initialize npm project**
   ```bash
   npm init -y
   ```

2. **Install Electron**
   ```bash
   npm install --save-dev electron
   ```

3. **Install Howler.js**
   ```bash
   npm install howler
   ```

4. **Create main.js** (Electron main process)

5. **Create renderer/index.html** (Game window)

6. **Test basic game loading**

## Resources & References

### Official Documentation
- **Electron:** https://www.electronjs.org/docs
- **OpenFL:** https://www.openfl.org/
- **Lime:** https://lime.openfl.org/
- **Howler.js:** https://howlerjs.com/
- **PubNub:** https://www.pubnub.com/docs/

### Flowlab Resources
- **Game URL:** https://flowlab.io/game/embed/2687779
- **Engine Version:** 5000
- **Engine Source:** https://releases.flowlab.io/5000.js

### Community
- **Flowlab Forum:** https://flowlab.io/forums
- **OpenFL Community:** https://community.openfl.org/
- **Electron Discord:** https://discord.gg/electron

## Implementation Status

### Phase 1: Electron Setup ✅ COMPLETE

**Completed:**
- ✅ npm project initialized with package.json
- ✅ Electron 28.x installed
- ✅ Howler.js 2.2.4 installed
- ✅ PubNub SDK downloaded locally (no CDN dependency)
- ✅ Main process created (main.js) with:
  - Window management (800x650, resizable)
  - Application menu (File, View, Help)
  - Fullscreen support (F11)
  - Developer tools access
  - About dialog
- ✅ Renderer process created (src/renderer/index.html) with:
  - All local script references (no external CDN)
  - Flowlab engine initialization
  - Audio system setup
  - Multiplayer support (RTC)
  - Keyboard/mouse input handling
- ✅ .gitignore configured
- ✅ README.md created with user documentation

**Current State:**
- All code dependencies are bundled locally
- No external CDN references (except game assets from flowlab.io)
- Ready to run with `npm start`
- Ready to build with `npm run build`

### Next Steps

**Phase 2: Asset Management**
- Consider implementing local asset caching
- Explore offline game data bundling
- Test game asset loading reliability

**Phase 3: Platform-Specific Features**
- Create application icons
- Add save/load functionality
- Implement settings menu
- Add screenshot capability

**Phase 4: Distribution**
- Generate platform-specific installers
- Code signing setup
- Auto-update mechanism

## Changelog

### 2025-11-20 (Session 2)
- **Electron project setup complete**
- Installed Electron and Howler.js via npm
- Downloaded PubNub SDK locally (pubnub.4.21.2.js)
- Created main.js with complete window and menu management
- Created src/renderer/index.html with all local references
- Created .gitignore for node_modules
- Created README.md with usage instructions
- All dependencies now bundled locally (no CDN)

### 2025-11-20 (Session 1)
- Initial project analysis
- Downloaded game engine and dependencies
- Created PLAN.md and CLAUDE.md
- Analyzed FlowAudio.js architecture
- Identified OpenFL/Lime framework
- Documented current structure

---

**Last Updated:** 2025-11-20
**AI Assistant:** Claude (Anthropic)
**Project Status:** Phase 1 Complete - Electron App Ready to Run
