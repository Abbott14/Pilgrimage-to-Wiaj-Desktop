# Flowlab to Electron Desktop Game Conversion Plan

## Project Overview

**Game Title:** The New Pilgrimage to Wiaj
**Game ID:** 2687779
**Original Platform:** Flowlab.io (Web-based)
**Target Platform:** Desktop (Windows, macOS, Linux) via Electron

## Current State Analysis

### Downloaded Assets
- ✅ Game embed HTML (`game_embed.html`)
- ✅ Flowlab engine v5000 (`flowlab-engine-5000.js` - 8.5MB)
- ✅ jQuery 1.8.3 (`jquery-1.8.3.min.js`)
- ✅ FlowAudio.js (Howler.js wrapper)
- ✅ RTC libraries for multiplayer (rtc-pubnub.js, rtc-xirsys.js)

### Game Architecture Discovered

1. **Game Engine:** OpenFL/Lime framework
   - Compiled from Haxe to JavaScript
   - HTML5 canvas-based rendering
   - Game size: 384x384 pixels

2. **Audio System:** FlowAudio.js
   - Wrapper around Howler.js library
   - Supports HTML5 audio with fallback
   - Features: volume control, panning, looping, sound pooling (max 32 concurrent sounds)

3. **Multiplayer Support:**
   - PubNub SDK (v4.21.2)
   - WebRTC via Xirsys and PubNub adapters
   - Can be optionally disabled for single-player desktop version

4. **Game Data:**
   - Dynamically loaded from: `/html5/bin/assets2/data/2687779/data.json`
   - Contains game objects, behaviors, and level data
   - Protected by Cloudflare (requires runtime loading)

5. **Asset Structure:**
   - Root path: `/html5/bin`
   - Asset root: `assets2`
   - Fonts: D-DIN, Whitney-Book
   - Images, sounds, and other assets loaded dynamically

## Conversion Strategy

### Phase 1: Basic Electron Setup ✓ (Next Step)

**Objective:** Create a minimal Electron app that loads the Flowlab game

**Tasks:**
1. Initialize Node.js project with `package.json`
2. Install Electron as dependency
3. Create main process file (`main.js`)
4. Create renderer process (HTML wrapper for game)
5. Configure Electron window settings
6. Set up basic app structure

**Technical Decisions:**
- Window size: 800x600 (provides space for 384x384 game canvas + UI)
- Enable Node.js integration in renderer (may be needed for file access)
- Disable web security temporarily for development (to load external assets)

### Phase 2: Asset Integration

**Objective:** Make all game assets available locally

**Approach Options:**

**Option A: Proxy Server (Recommended for MVP)**
- Keep assets loading from flowlab.io
- Implement simple error handling
- Pros: Quick setup, always up-to-date
- Cons: Requires internet connection

**Option B: Full Asset Download**
- Download all game assets (images, sounds, data)
- Modify asset paths to load from local filesystem
- Pros: True offline support
- Cons: Requires comprehensive asset discovery and path remapping

**Option C: Hybrid Approach**
- Bundle essential assets (engine, scripts)
- Load game data dynamically from flowlab.io with caching
- Pros: Balance between size and functionality
- Cons: More complex implementation

**Recommended:** Start with Option A, implement Option C for production

### Phase 3: Dependency Management

**Required External Libraries:**
1. **Howler.js** - Audio library (FlowAudio.js dependency)
   - Install via npm: `howler`
   - Version: Latest stable (2.x)

2. **PubNub SDK** (Optional for multiplayer)
   - Already loaded via CDN in current implementation
   - Can be bundled locally if needed

3. **jQuery 1.8.3**
   - Already downloaded
   - Consider upgrading to 3.x for security

**Implementation:**
- Bundle all scripts in the app package
- Update script paths in HTML to use local files
- Use Electron's protocol handler if needed

### Phase 4: Platform-Specific Adaptations

**Desktop Features to Implement:**

1. **Window Management**
   - Menu bar (File, Edit, View, Help)
   - Fullscreen toggle (F11)
   - Minimize/Maximize/Close
   - Remember window size/position

2. **Keyboard Input**
   - Ensure all keyboard events work properly
   - Prevent browser shortcuts from interfering
   - Add desktop-specific shortcuts

3. **File System Access** (Future enhancement)
   - Save game progress locally
   - Settings persistence
   - Screenshot capability

4. **Performance Optimization**
   - Hardware acceleration enabled
   - Frame rate optimization
   - Memory management for audio pool

### Phase 5: Multiplayer Considerations

**Current Implementation:**
- Uses PubNub for real-time communication
- Uses WebRTC for peer-to-peer connections
- Uses Xirsys for TURN/STUN servers

**Desktop Strategy:**
- Keep multiplayer functional (requires internet)
- Ensure WebRTC works in Electron
- May need to configure security policies

**Alternative:** Create single-player mode by:
- Stubbing out RTC functions
- Disabling multiplayer UI elements
- Focusing on offline gameplay

### Phase 6: Building & Distribution

**Build Process:**
1. Use `electron-builder` or `electron-forge`
2. Create installers for:
   - Windows (NSIS installer, portable exe)
   - macOS (DMG, app bundle)
   - Linux (AppImage, deb, rpm)

**Code Signing:**
- Windows: Authenticode certificate
- macOS: Apple Developer certificate
- Linux: Not required but recommended

**Auto-Updates:**
- Implement electron-updater
- Set up update server or use GitHub releases

### Phase 7: Testing & Polish

**Testing Checklist:**
- [ ] Game loads successfully
- [ ] All controls work (keyboard, mouse)
- [ ] Audio plays correctly
- [ ] Game logic functions properly
- [ ] Window resizing behaves correctly
- [ ] App launches on all target platforms
- [ ] Performance is acceptable (60 FPS)
- [ ] Memory leaks checked
- [ ] Multiplayer functionality (if included)

**Polish Items:**
- [ ] Custom app icon
- [ ] Splash screen while loading
- [ ] Loading progress indicator
- [ ] Error handling and user feedback
- [ ] Settings menu
- [ ] About dialog
- [ ] Proper app metadata

## Technical Challenges & Solutions

### Challenge 1: CORS and External Resources
**Problem:** Flowlab assets are hosted externally with CORS restrictions
**Solutions:**
- Disable web security in dev mode: `webPreferences.webSecurity = false`
- Use Electron's `protocol.interceptHttpProtocol` to proxy requests
- Download and bundle assets locally

### Challenge 2: Dynamic Asset Loading
**Problem:** Game data loaded at runtime from Flowlab servers
**Solutions:**
- Allow external requests (requires internet)
- Implement local caching mechanism
- Pre-fetch and bundle game data

### Challenge 3: Audio Initialization
**Problem:** Web Audio API requires user interaction to start
**Solutions:**
- Add "Click to Start" splash screen
- Use Electron's auto-play policies
- Initialize audio on first user input

### Challenge 4: Window Size vs Game Canvas
**Problem:** Game is 384x384, needs proper viewport
**Solutions:**
- Center canvas in larger window
- Add scaling options (1x, 2x, fullscreen)
- Implement letterboxing for different aspect ratios

### Challenge 5: Multiplayer in Desktop Context
**Problem:** WebRTC and PubNub designed for web browsers
**Solutions:**
- Electron has good WebRTC support
- Ensure proper permissions for network access
- Test firewall and NAT traversal

## Development Roadmap

### Sprint 1: MVP (1-2 days)
- [x] Download and analyze game files
- [ ] Create basic Electron app structure
- [ ] Load game in Electron window
- [ ] Verify game functionality

### Sprint 2: Enhancement (2-3 days)
- [ ] Improve window management
- [ ] Add menu bar
- [ ] Implement keyboard shortcuts
- [ ] Optimize performance

### Sprint 3: Asset Management (3-4 days)
- [ ] Bundle necessary assets
- [ ] Implement caching
- [ ] Offline support (if feasible)

### Sprint 4: Distribution (2-3 days)
- [ ] Configure electron-builder
- [ ] Create build scripts
- [ ] Generate installers for all platforms
- [ ] Test on multiple machines

### Sprint 5: Polish & Release (2-3 days)
- [ ] Create app icon
- [ ] Add splash screen
- [ ] Implement auto-updates
- [ ] Final testing
- [ ] Documentation and release

## File Structure (Planned)

```
Pilgrimage-to-Wiaj-Desktop/
├── main.js                 # Electron main process
├── preload.js             # Preload script (if needed)
├── package.json           # Project dependencies
├── package-lock.json      # Dependency lock file
├── README.md             # User documentation
├── CLAUDE.md             # Developer documentation
├── PLAN.md               # This file
│
├── assets/               # Game assets
│   ├── game-data.json    # Game data (if bundled)
│   └── icons/            # App icons
│       ├── icon.png
│       ├── icon.ico
│       └── icon.icns
│
├── src/
│   ├── renderer/         # Renderer process
│   │   ├── index.html    # Main game window
│   │   └── renderer.js   # Renderer scripts
│   │
│   ├── scripts/          # Game engine and libraries
│   │   ├── flowlab-engine-5000.js
│   │   ├── flowAudio.js
│   │   ├── jquery-1.8.3.min.js
│   │   ├── rtc-pubnub.js
│   │   └── rtc-xirsys.js
│   │
│   └── styles/           # CSS styles
│       └── app.css
│
├── build/                # Build configuration
│   └── icons/           # Platform-specific icons
│
└── dist/                # Built applications (gitignored)
```

## Next Steps

1. ✅ Download and inspect game files
2. ✅ Analyze architecture and dependencies
3. ✅ Create this conversion plan
4. **▶ Set up Electron project structure**
5. Create main.js and renderer HTML
6. Test basic game loading
7. Iterate on improvements

## Notes

- Game title: "the new pilgrimage to wiaj" (lowercase in original)
- Original game runs at 384x384 resolution
- Uses OpenFL/Lime framework (Haxe-based)
- Audio system supports up to 32 concurrent sounds
- Multiplayer features may need special consideration
- Cloudflare protection on asset URLs requires browser-like requests

## References

- Flowlab Game: https://flowlab.io/game/embed/2687779
- Electron Documentation: https://www.electronjs.org/docs
- OpenFL: https://www.openfl.org/
- Howler.js: https://howlerjs.com/
- PubNub: https://www.pubnub.com/
