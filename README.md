# Network Highway

A Chrome DevTools extension that visualizes HTTP requests as cars on a synthwave highway. Each network request becomes a vehicle, with properties like HTTP method, status code, duration, and response size mapped to visual attributes.

## Architecture

The extension follows a modular architecture with clear separation of concerns:

```
├── src/
│   ├── background/          # Chrome extension service worker
│   │   └── service-worker.ts
│   ├── devtools/            # DevTools panel
│   │   └── panel.tsx
│   ├── popup/               # Extension popup
│   │   └── popup.tsx
│   ├── highway/             # Visualization layer
│   │   ├── scene.ts         # Main PixiJS scene coordinator
│   │   ├── car.ts           # Vehicle rendering
│   │   ├── car-factory.ts   # Request → Car mapping
│   │   ├── city-background.ts # Retro city skyline
│   │   ├── highway-road.ts  # Road and grid rendering
│   │   ├── animations.ts    # GSAP animations
│   │   └── effects.ts       # Particle effects
│   └── shared/
│       └── types.ts         # Shared TypeScript types
```

## Component Overview

### Background Service Worker (`src/background/service-worker.ts`)

**Purpose:** Intercepts and tracks network requests via Chrome's `webRequest` API.

**Key Responsibilities:**
- Listens to `chrome.webRequest.onBeforeRequest` to track request initiation
- Correlates requests with `onCompleted` or `onErrorOccurred` events
- Calculates request duration and response size
- Broadcasts completed requests to connected DevTools panels via long-lived ports
- Maintains a pending requests map with automatic cleanup of stale entries (60s timeout)

**Data Flow:**
1. Request starts → stored in `pendingRequests` Map
2. Request completes/enerrors → matched with tracked entry
3. Full `NetworkRequest` payload sent to all connected panels
4. Entry removed from `pendingRequests`

### DevTools Panel (`src/devtools/panel.tsx`)

**Purpose:** Entry point for the visualization canvas in Chrome DevTools side panel.

**Key Responsibilities:**
- Initializes the PixiJS `HighwayScene`
- Establishes long-lived connection to background service worker
- Receives network request messages and forwards to scene
- Handles container resize with `ResizeObserver`
- Provides debug logging overlay

**Initialization Flow:**
1. Wait for container to have valid dimensions
2. Create and initialize `HighwayScene`
3. Connect to background via `chrome.runtime.connect()`
4. Listen for `REQUEST_COMPLETED`/`REQUEST_ERROR` messages
5. Pass payloads to `scene.addRequest()`

### Highway Scene (`src/highway/scene.ts`)

**Purpose:** Main PixiJS application coordinator, manages layers and scene lifecycle.

**Layer Architecture (back to front):**
1. **City Layer** - Procedural city skyline background
2. **Road Layer** - Highway surface with scrolling grid
3. **Car Layer** - Vehicles representing requests
4. **Effects Layer** - Particle explosions, glow effects

**Key Methods:**
- `init(container)` - Sets up PixiJS Application, builds scene layers
- `addRequest(request)` - Creates car from request, triggers animations
- `update(ticker)` - Called on each frame, updates city and road
- `rebuildScene()` - Rebuilds layers on resize

**Lane Configuration:**
- 3 lanes: fast (top), normal, slow (bottom)
- Lane selection based on request duration
- Random Y-offset within lane to prevent perfect overlap

### Car Factory (`src/highway/car-factory.ts`)

**Purpose:** Maps network request properties to visual car attributes.

**Classification Functions:**

| Request Property | Visual Attribute | Mapping Rules |
|------------------|-------------------|---------------|
| HTTP Method | Vehicle Type | GET → sedan, POST → truck, DELETE → sports, PUT/PATCH → bus |
| Status Code | Color | 2xx → green, 3xx → yellow, 4xx/5xx → red, error → dark |
| Duration | Lane | <100ms → fast lane, <500ms → normal, ≥500ms → slow lane |
| Response Size | Scale | <1KB → 0.6, <10KB → 0.7, <100KB → 0.8, <1MB → 1.2, ≥1MB → 1.4 |

**Factory Pattern:**
- `createCarFromRequest()` combines all classifications
- Creates `Car` instance with calculated properties
- Handles lane positioning with subtle random offset

### Car Rendering (`src/highway/car.ts`)

**Purpose:** Renders vehicle sprites using PixiJS Graphics API.

**Vehicle Types:**
- **Sedan** - Low, sleek profile (GET requests)
- **Truck** - Big, boxy with cargo (POST requests)
- **Sports Car** - Low, wide, aggressive (DELETE requests)
- **Bus** - Long, tall with windows (PUT/PATCH requests)

**Visual Elements:**
- Main body colored by status code
- Cabin/roof (darker shade)
- Windshields and windows (cyan with alpha)
- Wheels with rims
- Headlights (warm white) and taillights (red)
- Neon underglow (matching body color, layered alpha)

**Drawing Pattern:**
1. Clear and create Graphics containers
2. Draw body shapes with `roundRect()`, `rect()`, `circle()`
3. Apply colors with `fill()` using alpha values
4. Add glowing underglow beneath vehicle
5. Set initial alpha to 0 for fade-in animation

### City Background (`src/highway/city-background.ts`)

**Purpose:** Renders procedural synthwave city skyline with twinkling effects.

**Scene Composition:**
1. **Sky Gradient** - 5-stop vertical gradient (deep purple → pink → orange → yellow)
2. **Star Field** - 60 stars with random positions and drift animation
3. **Building Layers** - 3 depth layers (far, mid, near) with isometric projection
4. **Horizon Glow** - Neon strip at 58% viewport height
5. **Twinkling Windows** - Random neon windows that flicker

**Building Generation:**
- Procedural building count and dimensions per layer
- Isometric projection with depth scaling
- Front, top, and side faces with different shades
- Random window grid with neon colors (magenta, cyan, pink, yellow)
- Occasional horizontal neon sign strips

**Animation:**
- Windows twinkle every 4th frame with random rate
- Stars drift slowly downward, wrap to top
- Background is static between updates (no redraw)

### Highway Road (`src/highway/highway-road.ts`)

**Purpose:** Renders the highway surface with scrolling grid effect.

**Visual Elements:**
- Road shoulders (dark strips above and below)
- Road surface (deep navy)
- Lane dividers (dashed magenta neon lines)
- Top/bottom edges (bright pink neon)
- Scrolling vertical grid lines (classic outrun effect)
- Sub-lane horizontal grid lines for perspective

**Scrolling Animation:**
- Vertical grid lines scroll left-to-right (simulates forward motion)
- Grid offset increments each frame, wraps at 40px
- Horizontal lines provide static perspective grid
- Animation runs in `update(dt)` method

### Animations (`src/highway/animations.ts`)

**Purpose:** GSAP-powered car animations.

**Animation Types:**

| Animation | Trigger | Effect |
|-----------|---------|--------|
| `animateCarEnter` | New request | Fade in + move from left to target X |
| `animateCarExit` | Success response | Move right + fade out, destroy car |
| `animateCarLaneChange` | (reserved) | Smooth Y-shift between lanes |
| `animateCrash` | Error/timeout | Flash body, spawn explosion, spin & shrink |

**Timing Logic:**
- Duration mapped from request duration (50ms → 2.5s, 2000ms → 1.5s)
- Crash position: random X between 30-70% of screen width
- Exit position: 100px past right edge

### Effects (`src/highway/effects.ts`)

**Purpose:** Particle effects for crashes and neon rendering utilities.

**Explosion Effect:**
- 14 particles in circular burst pattern
- Expanding ring at center
- Particles move outward with random distance (25-70px)
- All particles fade and destroy on completion

**Neon Glow Helper:**
- `drawNeonGlow()` renders shape twice: large glow + small core
- Scale multiplier of 1.3 for glow layer
- Alpha values: 0.15 for glow, 0.9 for core
- Used for consistent neon aesthetic across effects

## Data Flow

```
1. Browser makes HTTP request
   ↓
2. Chrome webRequest API intercepts
   ↓
3. Background service worker stores in pendingRequests
[onBeforeRequest]
   ↓
4. Request completes or errors
[onCompleted / onErrorOccurred]
   ↓
5. Background correlates with pending request entry
   ↓
6. Calculates duration, response size
   ↓
7. Broadcasts NetworkRequest payload via port
   ↓
8. DevTools panel receives message
   ↓
9. Panel calls scene.addRequest(payload)
   ↓
10. CarFactory creates Car with classified attributes
    - Method → vehicle type
    - Status code → color
    - Duration → lane
    - Size → scale
    ↓
11. Scene adds car to carLayer
    ↓
12. Animations triggered based on status
    - Success → enter → exit
    - Error → enter → crash → destroy
    ↓
13. PixiJS renders scene on each ticker update
    - City updates (star drift, window twinkle)
    - Road updates (grid scroll)
    - Cars animate via GSAP
    - Effects animate and self-destruct
```

## Tech Stack

- **Pixi.js** v8.9.2 - High-performance 2D WebGL renderer
- **GSAP** v3.12.5 - Animation engine
- **React**' v19.1.0 - UI components (popup, panel)
- **TypeScript** v5.7.3 - Type safety
- **Vite** v6.3.5 - Build tool and dev server
- **Chrome Extension Manifest v3** - Extension API

## Chrome Extension APIs Used

- `chrome.webRequest` - Intercept HTTP requests
- `chrome.runtime` - Port-based messaging
- `chrome.devtools` - DevTools panel integration
- `chrome.sidePanel` - Side panel management

## Visual Design

### Synthwave Aesthetic

- **Color Palette:** Deep purples (0x0a0015), hot pinks (0xff0060), magentas (0xff00ff), cyans (0x00ffff), oranges (0xff6600)
- **Techniques:** Neon glow effects, perspective grids, isometric projection, gradient skies
- **Atmosphere:** 1980s retro-futuristic, nighttime cityscape, glowing underglow

### Layout

- Road starts at 58% of viewport height
- Road occupies 30% of viewport height
- 3 lanes, each 10% of viewport height
- Buildings occupy 30-60% of viewport height
- Sky gradient covers top 62%

## Performance Considerations

- **PixiJS WebGL acceleration** - Hardware-accelerated rendering
- **Object pooling via GSAP** - Reuses animation tweens
- **Self-destructing entities** - Cars and effects remove themselves from scene
- **Pending request cleanup** - Background worker removes stale entries
- **Layer optimization** - Static city layers don't redraw between updates
- **Batched rendering** - PixiJS automatically batches Graphics objects

## Extension Permissions

- `webRequest` - Required for network interception
- `devtools` - Required for panel access
- `<all_urls>` - Required to intercept all domains

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Future Enhancements

Potential areas for expansion:

- **Lane changing animations** - Smooth transitions when request duration changes mid-flight
- **Click to inspect** - Click on a car to see request details
- **Filter controls** - Filter by method, status code, domain
- **Session replay** - Replay captured requests on demand
- **Custom themes** - Alternative visual styles (daytime, minimal, etc.)
- **Speed controls**' - Adjust animation playback speed
- **Export data** - Export request data as JSON/CSV
- **Multiple tabs**' - Visualize requests from multiple browser tabs
