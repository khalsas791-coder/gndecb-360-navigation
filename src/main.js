import * as THREE from 'three';
import './style.css';
import {
  ALL_SECTIONS,
  getViewpoint,
  getSectionViewpoints,
  getSectionForScene,
  getConnectedSceneId,
  searchViewpoints
} from './data/navigationRegistry.js';
import { toggleAudioAmbiance, isSoundMuted } from './utils/audio.js';
import { runFullDiagnostic } from './utils/validator.js';

// ============================================================================
// GLOBAL APPLICATION STATE
// ============================================================================
let currentSection = 'hostel'; // 'campus' | 'hostel'
let currentSceneId = 'campus_2nd_gate';
let lastVisitedHostelScene = 'campus_2nd_gate';
let lastVisitedCampusScene = 'campus_main_gate';

let isAutoRotating = false;
let isLoadingTexture = false;

// High-Performance Texture Cache & Predictive Preloader
const textureCache = new Map();
const pendingTextureLoads = new Map();
let loaderTimeout = null;
let activeLoadToken = 0;

// Three.js Core Variables
let scene, camera, renderer, sphereMesh, textureLoader;
let isUserInteracting = false;
let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
let lon = 180, onPointerDownLon = 180;
let lat = 0, onPointerDownLat = 0;
let targetLon = 180, targetLat = 0;
let fov = 75, targetFov = 75;

// Touch & Multi-Touch Pinch-to-Zoom Tracking
const activePointers = new Map();
let initialPinchDistance = 0;
let pinchStartFov = 75;

// Run initial system diagnostic
runFullDiagnostic();

// ============================================================================
// APP INITIALIZATION & DOM TEMPLATE
// ============================================================================
function initApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <!-- WebGL Canvas for 360 Panorama -->
    <canvas id="webgl-canvas"></canvas>

    <!-- Texture Loading Spinner -->
    <div id="loader-overlay" class="loader-overlay">
      <div class="spinner"></div>
      <span id="loader-text" style="font-size:0.85rem; font-weight:600; color:var(--text-main);">Loading 360° Scene...</span>
    </div>

    <!-- "Panorama Not Added Yet" Overlay for Pending Views -->
    <div id="panorama-pending-overlay" class="panorama-pending-overlay">
      <div class="pending-card">
        <div class="pending-badge">
          <span>🏛️ GNDECB Campus 360°</span>
        </div>
        <h2 id="pending-title">College Main Gate</h2>
        <p id="pending-subtitle" class="pending-subtitle">Primary Institutional Entrance & Security Portal</p>
        
        <div class="pending-info-box">
          <p><strong>ℹ️ Panorama Status:</strong> 360° Equirectangular photography for this location is in progress.</p>
          <p>To view this location once captured, place your panorama asset at:</p>
          <code id="pending-path">public/panoramas/campus/main-gate/main-gate-01.jpeg</code>
        </div>

        <div class="pending-actions">
          <button id="btn-pending-explore-hostel" class="btn-primary" style="background:var(--primary-gradient);">
            <span>🏠 Explore Hostel 360° (Full VR Ready)</span>
          </button>
          <button id="btn-pending-all-campus" class="btn-search">
            <span>🏛️ Browse Campus Locations</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Street View Hotspots Overlay Container -->
    <div id="hotspots-overlay" class="hotspot-container"></div>

    <!-- UI Overlay Controls -->
    <div class="ui-overlay">
      <!-- Top Header Navbar -->
      <header class="header-nav">
        <div class="brand-section" id="btn-brand-home" title="GNDECB Virtual Tour Home">
          <div class="brand-logo">G</div>
          <div class="brand-text">
            <h1 id="app-main-title">GNDECB 360° TOUR</h1>
            <p>
              <span class="live-dot"></span>
              <span id="scene-title-header">Campus 2nd Gate</span>
            </p>
            <div class="breadcrumb-trail" id="breadcrumb-trail">
              <span>Hostel</span>
              <span class="breadcrumb-sep">&gt;</span>
              <span>Gates</span>
              <span class="breadcrumb-sep">&gt;</span>
              <span class="active">Campus 2nd Gate</span>
            </div>
          </div>
        </div>

        <!-- Experience Switcher (CAMPUS vs HOSTEL) -->
        <div class="experience-switcher">
          <button id="tab-campus" class="exp-tab-btn campus ${currentSection === 'campus' ? 'active' : ''}" title="Explore College Campus (Main Gate, 2nd Gate, Main Block, Canteen, Audi, Sports Room, Ground)">
            <span>🏛️ Campus 360°</span>
          </button>
          <button id="tab-hostel" class="exp-tab-btn hostel ${currentSection === 'hostel' ? 'active' : ''}" title="Explore Hostel (Gates, Lobby, Mess, Gym, Floors 1-5, Suite 525, Gurudwara)">
            <span>🏠 Hostel 360°</span>
          </button>
        </div>

        <!-- Scene Selector Quick Bar (Section-specific) -->
        <nav class="scene-switcher" id="scene-switcher-nav"></nav>

        <!-- Header Action Controls -->
        <div class="header-actions">
          <button id="btn-search-trigger" class="btn-search" title="Search all locations [Ctrl+K]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
            <span class="search-kbd">⌘K</span>
          </button>
          
          <button id="btn-audio" class="icon-btn" title="Toggle Ambient Audio">
            <i id="audio-icon"></i>
            <span class="dock-tooltip">Audio Ambiance</span>
          </button>

          <button id="btn-help" class="icon-btn" title="Navigation Guide & Help">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span class="dock-tooltip">Navigation Guide</span>
          </button>

          <button id="btn-book" class="btn-primary">
            <span>Book Visit</span>
          </button>

          <button id="btn-mobile-menu" class="icon-btn mobile-only-btn" title="All Locations Drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <span class="dock-tooltip">All Locations</span>
          </button>
        </div>
      </header>

      <!-- Side Quick Jump Panel (Elevator / Campus Directory) -->
      <aside class="elevator-panel" id="side-navigation-panel"></aside>

      <!-- Bottom Dock Bar & Controls -->
      <footer class="bottom-dock">
        <!-- Heading Indicator -->
        <div class="compass-widget">
          <div id="compass-dial" class="compass-dial">
            <div class="compass-needle"></div>
          </div>
          <span id="compass-heading">180° S</span>
        </div>

        <!-- Directional D-Pad Navigation Controls (FRONT / BACK / LEFT / RIGHT) -->
        <div class="dpad-container" id="dpad-navigation">
          <div class="dpad-row">
            <button class="dpad-btn" id="dpad-btn-forward" data-dir="forward" title="Walk Forward (Front)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              <span class="dock-tooltip" id="dpad-tip-forward">Forward</span>
            </button>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn" id="dpad-btn-left" data-dir="left" title="Turn / Move Left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span class="dock-tooltip" id="dpad-tip-left">Left</span>
            </button>
            <div class="dpad-center" id="dpad-center-label">NAV</div>
            <button class="dpad-btn" id="dpad-btn-right" data-dir="right" title="Turn / Move Right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="dock-tooltip" id="dpad-tip-right">Right</span>
            </button>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn" id="dpad-btn-back" data-dir="back" title="Walk Backward (Return)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              <span class="dock-tooltip" id="dpad-tip-back">Back</span>
            </button>
          </div>
        </div>

        <!-- Main Viewport Controls -->
        <div class="dock-controls">
          <button id="btn-reset-view" class="icon-btn" title="Reset Camera View">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
            <span class="dock-tooltip">Reset View</span>
          </button>

          <button id="btn-rotate" class="icon-btn" title="Toggle Auto-Rotation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span class="dock-tooltip">Auto Rotate</span>
          </button>
          
          <div class="dock-divider"></div>

          <button id="btn-zoom-in" class="icon-btn" title="Zoom In">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span class="dock-tooltip">Zoom In</span>
          </button>

          <button id="btn-zoom-out" class="icon-btn" title="Zoom Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span class="dock-tooltip">Zoom Out</span>
          </button>

          <div class="dock-divider"></div>

          <button id="btn-snapshot" class="icon-btn" title="Take 360 HD Snapshot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span class="dock-tooltip">Capture HD Snapshot</span>
          </button>

          <button id="btn-fullscreen" class="icon-btn" title="Toggle Fullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            <span class="dock-tooltip">Fullscreen</span>
          </button>

          <div class="dock-divider mobile-only-divider"></div>

          <button id="btn-mobile-locations" class="icon-btn mobile-only-btn" title="Open Locations Drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span class="dock-tooltip">Locations</span>
          </button>

          <button id="btn-mobile-map" class="icon-btn mobile-only-btn" title="Toggle 2D Mini-Map">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            <span class="dock-tooltip">Mini-Map</span>
          </button>
        </div>

        <!-- Interactive 2D Minimap -->
        <div class="minimap-card">
          <div class="minimap-header">
            <span id="minimap-section-tag">Campus Layout</span>
            <span id="minimap-level">GATE 0</span>
          </div>
          <div class="minimap-body">
            <svg class="minimap-svg" viewBox="0 0 100 100">
              <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" rx="4" />
              <path d="M 5,35 L 95,35 M 5,65 L 95,65 M 40,5 L 40,95 M 70,5 L 70,95" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
              <text x="20" y="20" fill="rgba(255,255,255,0.3)" font-size="5" text-anchor="middle">GATE 1</text>
              <text x="55" y="50" fill="rgba(0,240,255,0.5)" font-size="5" font-weight="bold" text-anchor="middle">GATE 2</text>
              <text x="85" y="80" fill="rgba(255,255,255,0.3)" font-size="5" text-anchor="middle">COURTYARD</text>
            </svg>
            <div id="minimap-cone" class="minimap-cone"></div>
            <div id="minimap-pin" class="minimap-pin"></div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Mobile Location Selector Drawer (Bottom Sheet) -->
    <div id="drawer-locations" class="drawer-backdrop">
      <div class="drawer-sheet">
        <div class="drawer-handle-bar">
          <div class="drawer-pill"></div>
        </div>
        <div class="drawer-header">
          <div class="drawer-title-wrap">
            <h3 class="drawer-title">Campus & Hostel Locations</h3>
            <span class="drawer-subtitle" id="drawer-subtitle">Select a destination to jump instantly</span>
          </div>
          <button class="modal-close drawer-close-btn" id="btn-close-drawer">&times;</button>
        </div>
        
        <!-- Drawer Experience Switcher Tabs -->
        <div class="drawer-switcher">
          <button id="drawer-tab-campus" class="drawer-tab ${currentSection === 'campus' ? 'active' : ''}">
            🏛️ Campus 360°
          </button>
          <button id="drawer-tab-hostel" class="drawer-tab ${currentSection === 'hostel' ? 'active' : ''}">
            🏠 Hostel 360°
          </button>
        </div>

        <div id="drawer-locations-list" class="drawer-body"></div>
      </div>
    </div>

    <!-- Mobile Mini-Map Modal Overlay -->
    <div id="modal-minimap" class="modal-backdrop">
      <div class="modal-card minimap-modal-card">
        <button class="modal-close" data-close="modal-minimap">&times;</button>
        <div class="minimap-modal-header">
          <h3 class="modal-title" id="mobile-minimap-section-tag">Hostel Layout</h3>
          <span class="badge" id="mobile-minimap-level">GATE 0</span>
        </div>
        <p class="modal-subtitle">Interactive 2D spatial layout and real-time viewing orientation.</p>
        
        <div class="mobile-minimap-body">
          <svg class="minimap-svg" viewBox="0 0 100 100">
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" rx="4" />
            <path d="M 5,35 L 95,35 M 5,65 L 95,65 M 40,5 L 40,95 M 70,5 L 70,95" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
            <text x="20" y="20" fill="rgba(255,255,255,0.3)" font-size="5" text-anchor="middle">GATE 1</text>
            <text x="55" y="50" fill="rgba(0,240,255,0.5)" font-size="5" font-weight="bold" text-anchor="middle">GATE 2</text>
            <text x="85" y="80" fill="rgba(255,255,255,0.3)" font-size="5" text-anchor="middle">COURTYARD</text>
          </svg>
          <div id="mobile-minimap-cone" class="minimap-cone"></div>
          <div id="mobile-minimap-pin" class="minimap-pin"></div>
        </div>

        <button class="btn-primary" data-close="modal-minimap" style="width:100%; justify-content:center; margin-top:1rem;">
          <span>Close Mini-Map</span>
        </button>
      </div>
    </div>

    <!-- Search Modal -->
    <div id="modal-search" class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" data-close="modal-search">&times;</button>
        <h3 class="modal-title">Search Virtual Tour</h3>
        <p class="modal-subtitle">Find any campus facility, hostel floor, suite, or landmark.</p>
        
        <div class="search-input-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="global-search-input" class="search-input" placeholder="Type to search (e.g. Canteen, Room 525, Gym, Main Gate)..." autofocus />
        </div>

        <div id="search-results-container" class="search-results-list"></div>
      </div>
    </div>

    <!-- Dual Experience Welcome Modal -->
    <div id="modal-welcome" class="modal-backdrop">
      <div class="modal-card" style="max-width: 640px;">
        <button class="modal-close" data-close="modal-welcome">&times;</button>
        <h3 class="modal-title">Welcome to GNDECB Virtual Tour</h3>
        <p class="modal-subtitle">Select an experience below to begin your immersive 360° virtual walkthrough.</p>
        
        <div class="experience-grid">
          <div class="experience-card campus-card" id="btn-choose-campus">
            <div>
              <div class="exp-card-icon">🏛️</div>
              <h4>Campus 360°</h4>
              <p>Explore College Main Gate, 2nd Gate, Main Academic Block, Central Canteen, Auditorium, Sports Room, and College Ground.</p>
            </div>
            <span class="exp-card-badge">7 Key Locations</span>
          </div>

          <div class="experience-card hostel-card" id="btn-choose-hostel">
            <div>
              <div class="exp-card-icon">🏠</div>
              <h4>Hostel 360°</h4>
              <p>Explore Old Canteen, Hostel Gates 0-2, Courtyard, Reception Lobby, Mess, Gyms, Floors 1-5, Deluxe Suite 525, and Gurudwara Sahib.</p>
            </div>
            <span class="exp-card-badge">26+ VR Views</span>
          </div>
        </div>

        <button class="btn-primary" data-close="modal-welcome" style="width:100%; justify-content:center;">
          <span>Continue Exploring</span>
        </button>
      </div>
    </div>

    <!-- Booking Modal -->
    <div id="modal-booking" class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" data-close="modal-booking">&times;</button>
        <h3 class="modal-title">Schedule a Campus & Hostel Visit</h3>
        <p class="modal-subtitle">Experience GNDECB world-class academic and living facilities in person.</p>
        
        <form id="form-booking">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" class="form-input" placeholder="e.g. Harpreet Singh" required />
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" class="form-input" placeholder="harpreet@example.com" required />
          </div>
          <div class="feature-grid">
            <div class="form-group" style="margin:0;">
              <label>Tour Preference</label>
              <select class="form-select">
                <option>Complete Campus & Hostel Tour</option>
                <option>Hostel Accommodation Only (Suite 525)</option>
                <option>Academic Blocks & Laboratories</option>
                <option>Sports Complex & Grounds</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label>Visit Date</label>
              <input type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
            </div>
          </div>
          <button type="submit" class="btn-primary" style="width:100%; justify-content:center; margin-top:1rem; padding:0.8rem;">
            <span>Confirm Visit Appointment</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Feature Info Modal -->
    <div id="modal-info" class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" data-close="modal-info">&times;</button>
        <h3 id="info-title" class="modal-title">Feature Detail</h3>
        <p id="info-subtitle" class="modal-subtitle">GNDECB Specifications</p>
        <div id="info-content" style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.5rem;">
          Detailed information about this area.
        </div>
        <button class="btn-primary" data-close="modal-info" style="width:100%; justify-content:center;">
          <span>Close Information</span>
        </button>
      </div>
    </div>

    <!-- Navigation Help Modal -->
    <div id="modal-help" class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" data-close="modal-help">&times;</button>
        <h3 class="modal-title">360° Navigation & Guide</h3>
        <p class="modal-subtitle">Interactive Google Street View style Virtual Navigation System.</p>
        
        <div class="feature-grid">
          <div class="feature-item">
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </div>
            <div class="feature-info">
              <h4>Dual Experiences</h4>
              <p>Switch smoothly between Campus 360° and Hostel 360° using the top navigation tabs.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
            </div>
            <div class="feature-info">
              <h4>D-Pad & Hotspot Controls</h4>
              <p>Use FRONT, BACK, LEFT, and RIGHT buttons or click glowing 3D arrows to walk between connected rooms and areas.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div class="feature-info">
              <h4>Instant Search</h4>
              <p>Press <strong>Ctrl + K</strong> or click Search to jump to any room, building, or facility instantly.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
            </div>
            <div class="feature-info">
              <h4>Mouse & Keyboard</h4>
              <p>Drag to look around, scroll to zoom in/out, or use W/A/S/D and Arrow keys on desktop.</p>
            </div>
          </div>
        </div>

        <button class="btn-primary" data-close="modal-help" style="width:100%; justify-content:center;">
          <span>Got it, Start Exploring!</span>
        </button>
      </div>
    </div>

    <!-- Toast Notification Container -->
    <div id="toast-container" class="toast-container"></div>
  `;

  updateAudioIcon();
  renderSceneQuickBar();
  renderSidePanel();
  renderMobileDrawer();
  renderMobileDrawer();
  initThreeViewer();
  setupEventListeners();
  loadScene(currentSceneId);
}

// ============================================================================
// THREE.JS EQUIRECTANGULAR 360 VIEWER
// ============================================================================
function initThreeViewer() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;
  
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1100);
  camera.target = new THREE.Vector3(0, 0, 0);

  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1); // Invert sphere so texture displays on inner surface

  textureLoader = new THREE.TextureLoader();

  // Create base material with default white color so textures render at full natural brightness
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(onWindowResize, 150);
  });
  document.addEventListener('fullscreenchange', () => {
    setTimeout(onWindowResize, 150);
  });
  canvas.addEventListener('wheel', onDocumentMouseWheel, { passive: false });

  animate();
}

// ============================================================================
// SCENE & EXPERIENCE SWITCHING LOGIC
// ============================================================================

/**
 * Switch experience mode ('campus' or 'hostel')
 */
function setExperienceSection(section) {
  if (currentSection === section) return;

  currentSection = section;

  // Update tabs UI
  document.getElementById('tab-campus')?.classList.toggle('active', section === 'campus');
  document.getElementById('tab-hostel')?.classList.toggle('active', section === 'hostel');
  document.getElementById('drawer-tab-campus')?.classList.toggle('active', section === 'campus');
  document.getElementById('drawer-tab-hostel')?.classList.toggle('active', section === 'hostel');

  // Update brand header
  const appMainTitle = document.getElementById('app-main-title');
  if (appMainTitle) {
    appMainTitle.textContent = section === 'campus' ? 'GNDECB CAMPUS 360°' : 'GNDECB HOSTEL 360°';
  }

  renderSceneQuickBar();
  renderSidePanel();
  renderMobileDrawer();
  renderMobileDrawer();

  // Load appropriate scene for this section
  const targetScene = section === 'campus' ? lastVisitedCampusScene : lastVisitedHostelScene;
  loadScene(targetScene);
  showToast(`Switched to ${ALL_SECTIONS[section].title}`);
}

/**
 * Render horizontal quick switcher bar based on active section
 */
function renderSceneQuickBar() {
  const container = document.getElementById('scene-switcher-nav');
  if (!container) return;

  const viewpoints = getSectionViewpoints(currentSection);
  container.innerHTML = Object.values(viewpoints).map(vp => `
    <button class="scene-btn ${vp.id === currentSceneId ? 'active' : ''}" data-scene="${vp.id}" title="${vp.name}">
      <span>${vp.name}</span>
    </button>
  `).join('');
}

/**
 * Render right-hand elevator / navigation panel based on active section
 */
function renderSidePanel() {
  const container = document.getElementById('side-navigation-panel');
  if (!container) return;

  if (currentSection === 'hostel') {
    container.innerHTML = `
      <div class="elevator-header">Gates & Perimeter</div>
      <button class="elevator-btn ${['way_to_canteen', 'canteen', 'way_to_main_campus', 'way_to_main_campus_2', 'main_campus_lane'].includes(currentSceneId) ? 'active' : ''}" data-scene="canteen">
        CAN<span class="elevator-tooltip">Old Canteen & Main Campus Lane</span>
      </button>
      <button class="elevator-btn ${['way_to_first_year_block', 'way_to_first_year_block_2', 'new_canteen', 'way_to_hod_office', 'hod_office_room', 'first_year_ladies_staff', 'first_year_1st_floor', 'first_year_2nd_floor', 'first_year_gents_staff_room', 'chemistry_lab', 'physics_lab', 'python_lab'].includes(currentSceneId) ? 'active' : ''}" data-scene="way_to_first_year_block">
        1YR<span class="elevator-tooltip">1st Year Block & New Canteen</span>
      </button>
      <button class="elevator-btn ${['main_block_0', 'way_to_cse_lab', 'cse_lab_2', 'way_to_cse_hod_office', 'way_to_cse_hod_office_2', 'cse_hod_office', 'cse_lab', 'way_to_student_section_main_block', 'way_to_admin_block_1', 'way_to_admin_block_2', 'way_to_main_block_1', 'way_to_main_block_2', 'way_to_main_block_3', 'way_to_main_block_4', 'mb_1f_right', 'mb_1f_eee_rd', 'mb_1f_way_to_eee_hod_1', 'mb_1f_way_to_eee_hod_2', 'mb_1f_way_to_eee_hod_3', 'mb_1f_eee_staff', 'eee_hod_office', 'microcontroller_lab', 'analog_electronic_lab', 'mb_1f_mba_block', 'mb_1f_mba_hod_staff', 'mb_1f_way_to_eee_from_mba', 'mb_2f_left', 'mb_2f_left_corridor', 'mb_2f_mba_hod', 'mb_2f_mba_staff', 'mb_2f_right', 'mb_2f_ece_hod', 'mb_2f_embedded_lab', 'mb_2f_embedded_system_lab', 'mb_2f_way_to_ece_lab', 'mb_2f_ece_lab_left', 'mb_2f_ece_lab_1', 'mb_2f_ece_lab_2', 'mb_2f_ece_staff_1', 'mb_2f_ece_staff_2', 'mb_3f_left', 'mb_3f_hod', 'mb_3f_ise_hod', 'mb_3f_ise_staff', 'mb_3f_way_to_aiml_hod', 'mb_3f_aiml_hod', 'mb_3f_aiml_staff', 'mb_3f_way_to_cse_aiml', 'mb_3f_cse_aiml_hod', 'mb_3f_cse_aiml_staff'].includes(currentSceneId) ? 'active' : ''}" data-scene="main_block_0">
        MB<span class="elevator-tooltip">Main Academic & Admin Block</span>
      </button>
      <button class="elevator-btn ${['way_to_central_library', 'move_to_library', 'first_floor_library', 'second_floor_library'].includes(currentSceneId) ? 'active' : ''}" data-scene="way_to_central_library">
        LIB<span class="elevator-tooltip">Central Library & Reading Halls</span>
      </button>
      <button class="elevator-btn ${['way_to_2nd_gate', 'way_to_2nd_gate_2', 'campus_2nd_gate', 'campus_parking'].includes(currentSceneId) ? 'active' : ''}" data-scene="campus_2nd_gate">
        CG2<span class="elevator-tooltip">Campus 2nd Gate, Avenue & Parking</span>
      </button>
      <button class="elevator-btn ${['way_to_mechanical', 'mechanical_branch', 'mechanical_engineering_branch', 'civil_lab', 'way_to_civil_block', 'civil_staff_room', 'mechanical_block', 'mechanical_staff_room', 'cad_lab', 'mechanical_hod_office', 'civil_hod_office', 'mechanical_machine_shop', 'mechanical_mmt_lab', 'civil_computer_lab'].includes(currentSceneId) ? 'active' : ''}" data-scene="mechanical_branch">
        MECH<span class="elevator-tooltip">Mechanical Branch & Approach</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'gate0' ? 'active' : ''}" data-scene="gate0">
        G0<span class="elevator-tooltip">Hostel Gate 0</span>
      </button>
      <button class="elevator-btn ${['way_to_auditorium', 'way_to_auditorium_2', 'way_to_auditorium_3', 'main_auditorium'].includes(currentSceneId) ? 'active' : ''}" data-scene="main_auditorium">
        AUD<span class="elevator-tooltip">Main Auditorium & Approach</span>
      </button>
      <button class="elevator-btn ${['way_to_ground', 'college_ground', 'sports_room', 'guru_bhavan_beside'].includes(currentSceneId) ? 'active' : ''}" data-scene="college_ground">
        GRD<span class="elevator-tooltip">College Ground, Sports Room & Guru Bhavan</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'gate1' ? 'active' : ''}" data-scene="gate1">
        G1<span class="elevator-tooltip">Hostel Gate 1</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'gate2' ? 'active' : ''}" data-scene="gate2">
        G2<span class="elevator-tooltip">Hostel Gate 2</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'outer_gym' ? 'active' : ''}" data-scene="outer_gym">
        GYM<span class="elevator-tooltip">Outer Open Gym</span>
      </button>
      
      <div class="elevator-header" style="margin-top:0.4rem;">Ground</div>
      <button class="elevator-btn ${currentSceneId === 'exterior' ? 'active' : ''}" data-scene="exterior">
        EXT<span class="elevator-tooltip">Main Courtyard</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'lobby' ? 'active' : ''}" data-scene="lobby">
        G<span class="elevator-tooltip">Ground Lobby</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'mess' ? 'active' : ''}" data-scene="mess">
        M<span class="elevator-tooltip">Hostel Mess</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'mess2' ? 'active' : ''}" data-scene="mess2">
        M2<span class="elevator-tooltip">Mess Veranda</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'way_to_gym' ? 'active' : ''}" data-scene="way_to_gym">
        WG<span class="elevator-tooltip">Way to Main Gym</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'main_gym' ? 'active' : ''}" data-scene="main_gym">
        MG<span class="elevator-tooltip">Main Gym</span>
      </button>
      
      <div class="elevator-header" style="margin-top:0.4rem;">Floors</div>
      <button class="elevator-btn ${currentSceneId === 'floor1' ? 'active' : ''}" data-scene="floor1">
        F1<span class="elevator-tooltip">Floor 1 Corridor</span>
      </button>
      <button class="elevator-btn ${['floor2', 'f2_entrance'].includes(currentSceneId) ? 'active' : ''}" data-scene="floor2">
        F2<span class="elevator-tooltip">Floor 2 Entrance</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'f2_corridor1' ? 'active' : ''}" data-scene="f2_corridor1">
        2C1<span class="elevator-tooltip">Floor 2 - Corridor 1</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'f2_corridor2' ? 'active' : ''}" data-scene="f2_corridor2">
        2C2<span class="elevator-tooltip">Floor 2 - Corridor 2 (R211-212)</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'floor3' ? 'active' : ''}" data-scene="floor3">
        F3<span class="elevator-tooltip">Floor 3 Corridor</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'floor4' ? 'active' : ''}" data-scene="floor4">
        F4<span class="elevator-tooltip">Floor 4 Corridor</span>
      </button>
      <button class="elevator-btn ${['f5_entrance', 'f5_corridor1', 'f5_corridor2', 'f5_corridor3'].includes(currentSceneId) ? 'active' : ''}" data-scene="f5_entrance">
        F5<span class="elevator-tooltip">Floor 5 Entrance</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'f5_corridor7' ? 'active' : ''}" data-scene="f5_corridor7">
        C7<span class="elevator-tooltip">Corridor 7 (Prayer Way)</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'f5_corridor8' ? 'active' : ''}" data-scene="f5_corridor8">
        C8<span class="elevator-tooltip">Corridor 8</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'f5_gurudwara' ? 'active' : ''}" data-scene="f5_gurudwara">
        GURU<span class="elevator-tooltip">Gurudwara Sahib</span>
      </button>
      <button class="elevator-btn ${currentSceneId === 'room_525' ? 'active' : ''}" data-scene="room_525">
        525<span class="elevator-tooltip">Room 525 Deluxe Suite</span>
      </button>
    `;
  } else {
    // Campus Directory Panel
    container.innerHTML = `
      <div class="elevator-header">Campus</div>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_main_gate' ? 'active' : ''}" data-scene="campus_main_gate">
        MG<span class="elevator-tooltip">College Main Gate</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_second_gate' ? 'active' : ''}" data-scene="campus_second_gate">
        2G<span class="elevator-tooltip">College 2nd Gate</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_main_block' ? 'active' : ''}" data-scene="campus_main_block">
        MB<span class="elevator-tooltip">Main Academic Block</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_canteen' ? 'active' : ''}" data-scene="campus_canteen">
        CAN<span class="elevator-tooltip">Central Canteen</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_auditorium' ? 'active' : ''}" data-scene="campus_auditorium">
        AUD<span class="elevator-tooltip">University Auditorium</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_sports_room' ? 'active' : ''}" data-scene="campus_sports_room">
        SPT<span class="elevator-tooltip">Campus Sports Room</span>
      </button>
      <button class="elevator-btn campus-btn ${currentSceneId === 'campus_ground' ? 'active' : ''}" data-scene="campus_ground">
        GRD<span class="elevator-tooltip">College Ground</span>
      </button>
    `;
  }
}

/**
 * Render mobile location drawer containing categorized location buttons
 */
function renderMobileDrawer() {
  const container = document.getElementById('drawer-locations-list');
  if (!container) return;

  if (currentSection === 'hostel') {
    container.innerHTML = `
      <div class="drawer-group">
        <h4 class="drawer-group-title">Gates & Perimeter</h4>
        <div class="drawer-grid">
          ${[
            { code: 'CAN', name: 'Old Canteen & Main Campus Lane', scene: 'canteen', matches: ['way_to_canteen', 'canteen', 'way_to_main_campus', 'way_to_main_campus_2', 'main_campus_lane'] },
            { code: '1YR', name: '1st Year Block & New Canteen', scene: 'way_to_first_year_block', matches: ['way_to_first_year_block', 'way_to_first_year_block_2', 'new_canteen', 'way_to_hod_office', 'hod_office_room', 'first_year_ladies_staff', 'first_year_1st_floor', 'first_year_2nd_floor', 'first_year_gents_staff_room', 'chemistry_lab', 'physics_lab', 'python_lab'] },
            { code: 'MB', name: 'Main Academic & Admin Block', scene: 'main_block_0', matches: ['main_block_0', 'way_to_cse_lab', 'cse_lab_2', 'way_to_cse_hod_office', 'way_to_cse_hod_office_2', 'cse_hod_office', 'cse_lab', 'way_to_student_section_main_block', 'way_to_admin_block_1', 'way_to_admin_block_2', 'way_to_main_block_1', 'way_to_main_block_2', 'way_to_main_block_3', 'way_to_main_block_4', 'mb_1f_right', 'mb_1f_eee_rd', 'mb_1f_way_to_eee_hod_1', 'mb_1f_way_to_eee_hod_2', 'mb_1f_way_to_eee_hod_3', 'mb_1f_eee_staff', 'eee_hod_office', 'microcontroller_lab', 'analog_electronic_lab', 'mb_1f_mba_block', 'mb_1f_mba_hod_staff', 'mb_1f_way_to_eee_from_mba', 'mb_2f_left', 'mb_2f_left_corridor', 'mb_2f_mba_hod', 'mb_2f_mba_staff', 'mb_2f_right', 'mb_2f_ece_hod', 'mb_2f_embedded_lab', 'mb_2f_embedded_system_lab', 'mb_2f_way_to_ece_lab', 'mb_2f_ece_lab_left', 'mb_2f_ece_lab_1', 'mb_2f_ece_lab_2', 'mb_2f_ece_staff_1', 'mb_2f_ece_staff_2', 'mb_3f_left', 'mb_3f_hod', 'mb_3f_ise_hod', 'mb_3f_ise_staff', 'mb_3f_way_to_aiml_hod', 'mb_3f_aiml_hod', 'mb_3f_aiml_staff', 'mb_3f_way_to_cse_aiml', 'mb_3f_cse_aiml_hod', 'mb_3f_cse_aiml_staff'] },
            { code: 'LIB', name: 'Central Library & Reading Halls', scene: 'way_to_central_library', matches: ['way_to_central_library', 'move_to_library', 'first_floor_library', 'second_floor_library'] },
            { code: 'CG2', name: 'Campus 2nd Gate, Avenue & Parking', scene: 'campus_2nd_gate', matches: ['way_to_2nd_gate', 'way_to_2nd_gate_2', 'campus_2nd_gate', 'campus_parking'] },
            { code: 'MECH', name: 'Mechanical Branch & Approach', scene: 'mechanical_branch', matches: ['way_to_mechanical', 'mechanical_branch', 'mechanical_engineering_branch', 'civil_lab', 'way_to_civil_block', 'civil_staff_room', 'mechanical_block', 'mechanical_staff_room', 'cad_lab', 'mechanical_hod_office', 'civil_hod_office', 'mechanical_machine_shop', 'mechanical_mmt_lab', 'civil_computer_lab'] },
            { code: 'G0', name: 'Hostel Gate 0', scene: 'gate0', matches: ['gate0'] },
            { code: 'AUD', name: 'Main Auditorium & Approach', scene: 'main_auditorium', matches: ['way_to_auditorium', 'way_to_auditorium_2', 'way_to_auditorium_3', 'main_auditorium'] },
            { code: 'GRD', name: 'College Ground, Sports Room & Guru Bhavan', scene: 'college_ground', matches: ['way_to_ground', 'college_ground', 'sports_room', 'guru_bhavan_beside'] },
            { code: 'G1', name: 'Hostel Gate 1', scene: 'gate1', matches: ['gate1'] },
            { code: 'G2', name: 'Hostel Gate 2', scene: 'gate2', matches: ['gate2'] },
            { code: 'GYM', name: 'Outer Open Gym', scene: 'outer_gym', matches: ['outer_gym'] }
          ].map(item => `
            <button class="drawer-loc-btn ${item.matches.includes(currentSceneId) ? 'active' : ''}" data-scene="${item.scene}">
              <span class="drawer-badge">${item.code}</span>
              <span class="drawer-loc-name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="drawer-group">
        <h4 class="drawer-group-title">Ground Level</h4>
        <div class="drawer-grid">
          ${[
            { code: 'EXT', name: 'Main Courtyard', scene: 'exterior', matches: ['exterior'] },
            { code: 'G', name: 'Ground Lobby', scene: 'lobby', matches: ['lobby'] },
            { code: 'M', name: 'Hostel Mess', scene: 'mess', matches: ['mess'] },
            { code: 'M2', name: 'Mess Veranda', scene: 'mess2', matches: ['mess2'] },
            { code: 'WG', name: 'Way to Main Gym', scene: 'way_to_gym', matches: ['way_to_gym'] },
            { code: 'MG', name: 'Main Gym', scene: 'main_gym', matches: ['main_gym'] }
          ].map(item => `
            <button class="drawer-loc-btn ${item.matches.includes(currentSceneId) ? 'active' : ''}" data-scene="${item.scene}">
              <span class="drawer-badge">${item.code}</span>
              <span class="drawer-loc-name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="drawer-group">
        <h4 class="drawer-group-title">Hostel Floors & Suites</h4>
        <div class="drawer-grid">
          ${[
            { code: 'F1', name: 'Floor 1 Corridor', scene: 'floor1', matches: ['floor1'] },
            { code: 'F2', name: 'Floor 2 Entrance', scene: 'floor2', matches: ['floor2', 'f2_entrance'] },
            { code: '2C1', name: 'Floor 2 - Corridor 1', scene: 'f2_corridor1', matches: ['f2_corridor1'] },
            { code: '2C2', name: 'Floor 2 - Corridor 2 (R211-212)', scene: 'f2_corridor2', matches: ['f2_corridor2'] },
            { code: 'F3', name: 'Floor 3 Corridor', scene: 'floor3', matches: ['floor3'] },
            { code: 'F4', name: 'Floor 4 Corridor', scene: 'floor4', matches: ['floor4'] },
            { code: 'F5', name: 'Floor 5 Entrance', scene: 'f5_entrance', matches: ['f5_entrance', 'f5_corridor1', 'f5_corridor2', 'f5_corridor3'] },
            { code: 'C7', name: 'Corridor 7 (Prayer Way)', scene: 'f5_corridor7', matches: ['f5_corridor7'] },
            { code: 'C8', name: 'Corridor 8', scene: 'f5_corridor8', matches: ['f5_corridor8'] },
            { code: 'GURU', name: 'Gurudwara Sahib', scene: 'f5_gurudwara', matches: ['f5_gurudwara'] },
            { code: '525', name: 'Room 525 Deluxe Suite', scene: 'room_525', matches: ['room_525'] }
          ].map(item => `
            <button class="drawer-loc-btn ${item.matches.includes(currentSceneId) ? 'active' : ''}" data-scene="${item.scene}">
              <span class="drawer-badge">${item.code}</span>
              <span class="drawer-loc-name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    // Campus Directory Drawer
    container.innerHTML = `
      <div class="drawer-group">
        <h4 class="drawer-group-title">Campus Landmarks</h4>
        <div class="drawer-grid">
          ${[
            { code: 'MG', name: 'College Main Gate', scene: 'campus_main_gate', matches: ['campus_main_gate'] },
            { code: '2G', name: 'College 2nd Gate', scene: 'campus_second_gate', matches: ['campus_second_gate'] },
            { code: 'MB', name: 'Main Academic Block', scene: 'campus_main_block', matches: ['campus_main_block'] },
            { code: 'CAN', name: 'Central Canteen', scene: 'campus_canteen', matches: ['campus_canteen'] },
            { code: 'AUD', name: 'University Auditorium', scene: 'campus_auditorium', matches: ['campus_auditorium'] },
            { code: 'SPT', name: 'Campus Sports Room', scene: 'campus_sports_room', matches: ['campus_sports_room'] },
            { code: 'GRD', name: 'College Ground', scene: 'campus_ground', matches: ['campus_ground'] }
          ].map(item => `
            <button class="drawer-loc-btn ${item.matches.includes(currentSceneId) ? 'active' : ''}" data-scene="${item.scene}">
              <span class="drawer-badge campus">${item.code}</span>
              <span class="drawer-loc-name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function openDrawer() {
  renderMobileDrawer();
  const drawer = document.getElementById('drawer-locations');
  if (drawer) {
    drawer.classList.add('active');
    document.body.classList.add('drawer-open');
  }
}

function closeDrawer() {
  const drawer = document.getElementById('drawer-locations');
  if (drawer) {
    drawer.classList.remove('active');
    document.body.classList.remove('drawer-open');
  }
}

function resetView() {
  targetLon = 180;
  targetLat = 0;
  targetFov = 75;
  showToast('Camera View Reset');
}

/**
 * High-Performance Asynchronous Texture Loader with Memory Caching
 * Omits mipmaps on equirectangular spheres to save 33% GPU memory and eliminate upload hitching.
 */
function getOrLoadTexture(url) {
  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url));
  }
  if (pendingTextureLoads.has(url)) {
    return pendingTextureLoads.get(url);
  }

  const p = new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        textureCache.set(url, texture);
        pendingTextureLoads.delete(url);
        resolve(texture);
      },
      undefined,
      (err) => {
        pendingTextureLoads.delete(url);
        reject(err);
      }
    );
  });

  pendingTextureLoads.set(url, p);
  return p;
}

/**
 * Predictive background preloader: loads immediate connected neighbors during idle time
 */
function preloadNeighbors(viewpoint) {
  if (!viewpoint) return;
  const neighborIds = new Set();

  if (viewpoint.connections) {
    Object.values(viewpoint.connections).forEach(id => {
      if (id) neighborIds.add(id);
    });
  }

  if (viewpoint.hotspots) {
    viewpoint.hotspots.forEach(hs => {
      if (hs.targetScene) neighborIds.add(hs.targetScene);
    });
  }

  const ids = Array.from(neighborIds);
  let i = 0;

  function loadNext() {
    if (i >= ids.length) return;
    const nextId = ids[i++];
    const nextVp = getViewpoint(nextId);
    if (nextVp && nextVp.hasImage && nextVp.image && !textureCache.has(nextVp.image)) {
      getOrLoadTexture(nextVp.image).then(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(loadNext, { timeout: 1500 });
        } else {
          setTimeout(loadNext, 120);
        }
      }).catch(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(loadNext, { timeout: 1500 });
        } else {
          setTimeout(loadNext, 120);
        }
      });
    } else {
      loadNext();
    }
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadNext, { timeout: 1000 });
  } else {
    setTimeout(loadNext, 150);
  }
}

/**
 * Smoothly apply texture to the 360 sphere without visual stutter
 */
function applySceneTexture(texture, viewpoint) {
  sphereMesh.material.color.setHex(0xffffff);
  sphereMesh.material.map = texture;
  sphereMesh.material.needsUpdate = true;
  
  targetLon = viewpoint.initialLon !== undefined ? viewpoint.initialLon : 180;
  targetLat = viewpoint.initialLat !== undefined ? viewpoint.initialLat : 0;

  updateMinimapPin();
  renderHotspots();
}

/**
 * Load a specific viewpoint with instant cache delivery and background preloading
 */
export function loadScene(sceneId) {
  const targetViewpoint = getViewpoint(sceneId);
  if (!targetViewpoint) {
    console.error(`[Navigation] Viewpoint with id "${sceneId}" not found.`);
    return;
  }

  // Ensure section aligns
  if (targetViewpoint.section !== currentSection) {
    currentSection = targetViewpoint.section;
    document.getElementById('tab-campus')?.classList.toggle('active', currentSection === 'campus');
    document.getElementById('tab-hostel')?.classList.toggle('active', currentSection === 'hostel');
    renderSceneQuickBar();
    renderSidePanel();
  renderMobileDrawer();
  }

  currentSceneId = sceneId;
  if (currentSection === 'campus') {
    lastVisitedCampusScene = sceneId;
  } else {
    lastVisitedHostelScene = sceneId;
  }

  // Update Header details
  const sceneTitleHeader = document.getElementById('scene-title-header');
  if (sceneTitleHeader) sceneTitleHeader.textContent = targetViewpoint.name;

  // Update breadcrumb
  const breadcrumbContainer = document.getElementById('breadcrumb-trail');
  if (breadcrumbContainer && targetViewpoint.breadcrumb) {
    breadcrumbContainer.innerHTML = targetViewpoint.breadcrumb.map((item, idx, arr) => `
      <span class="${idx === arr.length - 1 ? 'active' : ''}">${item}</span>
      ${idx < arr.length - 1 ? '<span class="breadcrumb-sep">&gt;</span>' : ''}
    `).join('');
  }

  // Update active state on quick bar and side panel
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === sceneId);
  });
  renderSidePanel();
  renderMobileDrawer();

  // Update Directional D-Pad controls
  updateDPadControls(targetViewpoint);

  // Handle Real Panorama vs Pending Panorama
  const pendingOverlay = document.getElementById('panorama-pending-overlay');
  const webglCanvas = document.getElementById('webgl-canvas');

  if (targetViewpoint.hasImage && targetViewpoint.image) {
    if (pendingOverlay) pendingOverlay.classList.remove('active');
    if (webglCanvas) webglCanvas.classList.remove('blurred');

    const imageUrl = targetViewpoint.image;
    const isCached = textureCache.has(imageUrl);
    const thisLoadToken = ++activeLoadToken;

    // Fast-path: If texture is already cached in memory, apply INSTANTLY (0 ms latency, no loader)
    if (isCached) {
      if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
      showLoader(false);
      applySceneTexture(textureCache.get(imageUrl), targetViewpoint);
      preloadNeighbors(targetViewpoint);
      return;
    }

    // Only show loader if fetching over the network takes longer than 120ms
    if (loaderTimeout) clearTimeout(loaderTimeout);
    loaderTimeout = setTimeout(() => {
      if (activeLoadToken === thisLoadToken) {
        showLoader(true, `Loading 360° view for ${targetViewpoint.name}...`);
      }
    }, 120);

    getOrLoadTexture(imageUrl)
      .then((texture) => {
        if (activeLoadToken !== thisLoadToken) return;
        if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
        showLoader(false);
        applySceneTexture(texture, targetViewpoint);
        preloadNeighbors(targetViewpoint);
      })
      .catch((err) => {
        if (activeLoadToken !== thisLoadToken) return;
        if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
        console.warn(`[TextureLoader] Image failed to load at ${imageUrl}:`, err);
        showLoader(false);
        showToast(`Image not found at ${imageUrl}`);
      });
  } else {
    // Pending Panorama state (e.g. campus location awaiting photography)
    if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
    showLoader(false);
    if (webglCanvas) webglCanvas.classList.add('blurred');
    sphereMesh.material.map = null;
    sphereMesh.material.color.setHex(0x0a0f1d);
    sphereMesh.material.needsUpdate = true;
    if (pendingOverlay) {
      pendingOverlay.classList.add('active');
      document.getElementById('pending-title').textContent = targetViewpoint.name;
      document.getElementById('pending-subtitle').textContent = targetViewpoint.subtitle || '';
      document.getElementById('pending-path').textContent = targetViewpoint.expectedPath || targetViewpoint.image;
    }
    updateMinimapPin();
    renderHotspots();
  }
}

/**
 * Update Directional D-Pad buttons state (FRONT, BACK, LEFT, RIGHT)
 * If there is a connected scene, navigates to it. If not, smoothly rotates the camera view!
 */
function updateDPadControls(viewpoint) {
  const directions = ['forward', 'back', 'left', 'right'];
  directions.forEach(dir => {
    const btn = document.getElementById(`dpad-btn-${dir}`);
    const tip = document.getElementById(`dpad-tip-${dir}`);
    const targetId = getConnectedSceneId(viewpoint.id, dir);

    if (btn) {
      if (targetId) {
        btn.disabled = false;
        btn.dataset.target = targetId;
        btn.removeAttribute('data-turn');
        const targetVp = getViewpoint(targetId);
        if (tip && targetVp) {
          tip.textContent = `${dir.toUpperCase()}: ${targetVp.name}`;
        }
      } else {
        btn.disabled = false;
        btn.removeAttribute('data-target');
        btn.dataset.turn = dir;
        if (tip) {
          tip.textContent = dir === 'left' ? 'Turn Left (45°)' :
                            dir === 'right' ? 'Turn Right (45°)' :
                            dir === 'back' ? 'Turn Around (180°)' : 'Look Forward';
        }
      }
    }
  });
}

function showLoader(visible, text = 'Loading 360° Scene...') {
  const loader = document.getElementById('loader-overlay');
  const loaderText = document.getElementById('loader-text');
  if (loaderText) loaderText.textContent = text;
  if (loader) {
    loader.classList.toggle('active', visible);
  }
}

// ============================================================================
// HOTSPOTS & 3D OVERLAYS
// ============================================================================
function renderHotspots() {
  const container = document.getElementById('hotspots-overlay');
  if (!container) return;
  container.innerHTML = '';

  const viewpoint = getViewpoint(currentSceneId);
  if (!viewpoint || !viewpoint.hotspots) return;

  viewpoint.hotspots.forEach((hs, idx) => {
    const el = document.createElement('div');
    el.className = 'hotspot-item';
    el.dataset.index = idx;

    if (hs.type === 'arrow') {
      const arrowDirClass = hs.arrowDir ? `dir-${hs.arrowDir}` : 'dir-forward';
      el.innerHTML = `
        <div class="streetview-arrow ${arrowDirClass}" title="${hs.title}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </div>
        <div class="hotspot-label">
          <div>
            <div>${hs.title}</div>
            <span>${hs.subtitle}</span>
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="hotspot-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <div class="hotspot-label">
          <div>
            <div>${hs.title}</div>
            <span>${hs.subtitle}</span>
          </div>
        </div>
      `;
    }

    // Prefetch target scene on hover for instantaneous click response
    el.addEventListener('pointerenter', () => {
      if (hs.targetScene) {
        const targetVp = getViewpoint(hs.targetScene);
        if (targetVp && targetVp.hasImage && targetVp.image && !textureCache.has(targetVp.image)) {
          getOrLoadTexture(targetVp.image);
        }
      }
    });

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hs.targetScene) {
        loadScene(hs.targetScene);
      } else if (hs.info) {
        showInfoModal(hs.title, hs.subtitle, hs.info);
      }
    });

    container.appendChild(el);
  });
}

function updateHotspotsPosition() {
  const viewpoint = getViewpoint(currentSceneId);
  if (!viewpoint || !viewpoint.hotspots) return;

  const elements = document.querySelectorAll('.hotspot-item');

  viewpoint.hotspots.forEach((hs, idx) => {
    const el = elements[idx];
    if (!el) return;

    const phi = THREE.MathUtils.degToRad(90 - hs.lat);
    const theta = THREE.MathUtils.degToRad(hs.lon);

    const position = new THREE.Vector3(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );

    const projectedVector = position.clone().project(camera);

    if (projectedVector.z > 1) {
      el.classList.add('hidden');
      return;
    }

    el.classList.remove('hidden');

    const x = (projectedVector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(projectedVector.y * 0.5) + 0.5) * window.innerHeight;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

// ============================================================================
// CAMERA CONTROLS & ANIMATION LOOP
// ============================================================================
function onPointerDown(event) {
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 1) {
    isUserInteracting = true;
    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
  } else if (activePointers.size === 2) {
    // 2 touches: start multi-touch pinch to zoom
    isUserInteracting = false;
    const pts = Array.from(activePointers.values());
    initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchStartFov = targetFov;
  }

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(event) {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 1 && isUserInteracting) {
    targetLon = (onPointerDownMouseX - event.clientX) * 0.22 + onPointerDownLon;
    targetLat = (event.clientY - onPointerDownMouseY) * 0.22 + onPointerDownLat;
  } else if (activePointers.size === 2 && initialPinchDistance > 10) {
    const pts = Array.from(activePointers.values());
    const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const distDiff = initialPinchDistance - currentDist;
    // Pinch fingers closer -> zoom out (increase FOV)
    // Spread fingers apart -> zoom in (decrease FOV)
    targetFov = Math.max(35, Math.min(100, pinchStartFov + distDiff * 0.15));
  }
}

function onPointerUp(event) {
  activePointers.delete(event.pointerId);

  if (activePointers.size === 1) {
    // Return to single touch panning with remaining pointer
    const remaining = Array.from(activePointers.values())[0];
    onPointerDownMouseX = remaining.x;
    onPointerDownMouseY = remaining.y;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    isUserInteracting = true;
  } else if (activePointers.size === 0) {
    isUserInteracting = false;
    initialPinchDistance = 0;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  }
}

function onDocumentMouseWheel(event) {
  event.preventDefault();
  targetFov = Math.max(35, Math.min(100, targetFov + event.deltaY * 0.05));
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
  requestAnimationFrame(animate);

  if (isAutoRotating && !isUserInteracting) {
    targetLon += 0.08;
  }

  lon += (targetLon - lon) * 0.22;
  lat += (targetLat - lat) * 0.22;
  fov += (targetFov - fov) * 0.2;

  lat = Math.max(-85, Math.min(85, lat));

  camera.fov = fov;
  camera.updateProjectionMatrix();

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
  camera.target.y = 500 * Math.cos(phi);
  camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(camera.target);

  updateCompassUI(lon);
  updateHotspotsPosition();
  renderer.render(scene, camera);
}

function updateCompassUI(angle) {
  const normAngle = ((angle % 360) + 360) % 360;
  const compassDial = document.getElementById('compass-dial');
  const compassHeading = document.getElementById('compass-heading');

  if (compassDial) compassDial.style.transform = `rotate(${-normAngle}deg)`;
  if (compassHeading) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dirIdx = Math.round(normAngle / 45) % 8;
    compassHeading.textContent = `${Math.round(normAngle)}° ${directions[dirIdx]}`;
  }

  const minimapCone = document.getElementById('minimap-cone');
  if (minimapCone) minimapCone.style.transform = `translate(-50%, -100%) rotate(${normAngle}deg)`;
  const mobileMinimapCone = document.getElementById('mobile-minimap-cone');
  if (mobileMinimapCone) mobileMinimapCone.style.transform = `translate(-50%, -100%) rotate(${normAngle}deg)`;
}

function updateMinimapPin() {
  const pin = document.getElementById('minimap-pin');
  const cone = document.getElementById('minimap-cone');
  const levelText = document.getElementById('minimap-level');
  const sectionTag = document.getElementById('minimap-section-tag');

  const mobilePin = document.getElementById('mobile-minimap-pin');
  const mobileCone = document.getElementById('mobile-minimap-cone');
  const mobileLevelText = document.getElementById('mobile-minimap-level');
  const mobileSectionTag = document.getElementById('mobile-minimap-section-tag');
  
  const viewpoint = getViewpoint(currentSceneId);
  if (!viewpoint) return;

  const pos = viewpoint.minimapPos;
  if (pos) {
    if (pin) { pin.style.top = pos.top; pin.style.left = pos.left; }
    if (cone) { cone.style.top = pos.top; cone.style.left = pos.left; }
    if (mobilePin) { mobilePin.style.top = pos.top; mobilePin.style.left = pos.left; }
    if (mobileCone) { mobileCone.style.top = pos.top; mobileCone.style.left = pos.left; }
  }
  const label = viewpoint.floorLabel || currentSceneId.toUpperCase();
  if (levelText) levelText.textContent = label;
  if (mobileLevelText) mobileLevelText.textContent = label;

  const sectionName = currentSection === 'campus' ? 'Campus Layout' : 'Hostel Layout';
  if (sectionTag) sectionTag.textContent = sectionName;
  if (mobileSectionTag) mobileSectionTag.textContent = sectionName;
}

// ============================================================================
// AUDIO, SNAPSHOT, SEARCH & MODAL HELPERS
// ============================================================================
function updateAudioIcon() {
  const container = document.getElementById('audio-icon');
  if (container) {
    container.innerHTML = isSoundMuted()
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
  }
}

function captureSnapshot() {
  try {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `GNDECB_360_${currentSection}_${currentSceneId}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('HD 360° Snapshot Saved to Downloads!');
  } catch (err) {
    showToast('Failed to capture snapshot');
  }
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showInfoModal(title, subtitle, content) {
  const t = document.getElementById('info-title');
  const s = document.getElementById('info-subtitle');
  const c = document.getElementById('info-content');
  if (t) t.textContent = title;
  if (s) s.textContent = subtitle;
  if (c) c.textContent = content;
  showModal('modal-info');
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-cyan)" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Handle Global Search logic
 */
function handleSearchInput(query) {
  const resultsContainer = document.getElementById('search-results-container');
  if (!resultsContainer) return;

  if (!query.trim()) {
    resultsContainer.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:1.5rem;">Start typing to search campus landmarks and hostel suites...</p>';
    return;
  }

  const matches = searchViewpoints(query);
  if (matches.length === 0) {
    resultsContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:1.5rem;">No locations found matching "${query}"</p>`;
    return;
  }

  resultsContainer.innerHTML = matches.map(item => `
    <div class="search-item" data-scene="${item.id}" data-section="${item.section}">
      <div class="search-item-info">
        <h5>${item.name}</h5>
        <p>${item.subtitle || item.category || ''}</p>
      </div>
      <span class="search-section-badge ${item.section}">
        ${item.section === 'campus' ? '🏛️ Campus' : '🏠 Hostel'}
      </span>
    </div>
  `).join('');
}

// ============================================================================
// EVENT LISTENERS & KEYBOARD SHORTCUTS
// ============================================================================
function setupEventListeners() {
  // Experience Switcher Tabs
  document.getElementById('tab-campus')?.addEventListener('click', () => setExperienceSection('campus'));
  document.getElementById('tab-hostel')?.addEventListener('click', () => setExperienceSection('hostel'));

  // Brand Logo Click opens Welcome Modal
  document.getElementById('btn-brand-home')?.addEventListener('click', () => showModal('modal-welcome'));

  // Welcome modal choices
  document.getElementById('btn-choose-campus')?.addEventListener('click', () => {
    closeModal('modal-welcome');
    setExperienceSection('campus');
  });
  document.getElementById('btn-choose-hostel')?.addEventListener('click', () => {
    closeModal('modal-welcome');
    setExperienceSection('hostel');
  });

  // Pending Overlay Buttons
  document.getElementById('btn-pending-explore-hostel')?.addEventListener('click', () => {
    setExperienceSection('hostel');
  });
  document.getElementById('btn-pending-all-campus')?.addEventListener('click', () => {
    showModal('modal-search');
    const input = document.getElementById('global-search-input');
    if (input) {
      input.value = 'Campus';
      handleSearchInput('Campus');
    }
  });

  // Scene click delegation (Quick bar, Elevator panel, Search items)
  document.addEventListener('click', (e) => {
    const sceneBtn = e.target.closest('[data-scene]');
    if (sceneBtn && sceneBtn.dataset.scene) {
      const targetScene = sceneBtn.dataset.scene;
      const targetSection = sceneBtn.dataset.section || getSectionForScene(targetScene);
      
      if (targetSection !== currentSection) {
        setExperienceSection(targetSection);
      }
      loadScene(targetScene);

      // If clicked inside search modal, close it
      if (e.target.closest('#modal-search')) {
        closeModal('modal-search');
      }
      // If clicked inside mobile locations drawer, close it
      if (e.target.closest('#drawer-locations')) {
        closeDrawer();
      }
    }
  });

  // Prefetch scene on hover over any button
  document.addEventListener('pointerover', (e) => {
    const sceneBtn = e.target.closest('[data-scene]');
    if (sceneBtn && sceneBtn.dataset.scene) {
      const targetVp = getViewpoint(sceneBtn.dataset.scene);
      if (targetVp && targetVp.hasImage && targetVp.image && !textureCache.has(targetVp.image)) {
        getOrLoadTexture(targetVp.image);
      }
    }
  });

  // Directional D-Pad buttons: prefetch on hover & instant navigation / smooth turns
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    const prefetchTarget = (e) => {
      const targetId = e.currentTarget.dataset.target;
      if (targetId) {
        const targetVp = getViewpoint(targetId);
        if (targetVp && targetVp.hasImage && targetVp.image && !textureCache.has(targetVp.image)) {
          getOrLoadTexture(targetVp.image);
        }
      }
    };
    btn.addEventListener('pointerenter', prefetchTarget);
    btn.addEventListener('touchstart', prefetchTarget, { passive: true });

    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.target;
      const turnDir = e.currentTarget.dataset.turn;
      if (targetId) {
        loadScene(targetId);
      } else if (turnDir) {
        if (turnDir === 'left') targetLon -= 45;
        if (turnDir === 'right') targetLon += 45;
        if (turnDir === 'back') targetLon += 180;
        if (turnDir === 'forward') targetLat = 0;
      }
    });
  });

  // Search Modal Trigger & Input
  document.getElementById('btn-search-trigger')?.addEventListener('click', () => {
    showModal('modal-search');
    const input = document.getElementById('global-search-input');
    if (input) {
      input.focus();
      handleSearchInput(input.value);
    }
  });

  document.getElementById('global-search-input')?.addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  // Top header action buttons
  document.getElementById('btn-rotate')?.addEventListener('click', (e) => {
    isAutoRotating = !isAutoRotating;
    e.currentTarget.classList.toggle('active', isAutoRotating);
    showToast(isAutoRotating ? 'Auto-rotation Enabled' : 'Auto-rotation Paused');
  });

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    targetFov = Math.max(35, targetFov - 10);
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    targetFov = Math.min(100, targetFov + 10);
  });

  document.getElementById('btn-snapshot')?.addEventListener('click', captureSnapshot);

  document.getElementById('btn-audio')?.addEventListener('click', () => {
    toggleAudioAmbiance((isPlaying) => {
      showToast(isPlaying ? 'Ambient Soundscape Playing' : 'Audio Muted');
      updateAudioIcon();
    });
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      showToast('Entered Fullscreen VR View');
    } else {
      document.exitFullscreen();
    }
  });

  document.getElementById('btn-book')?.addEventListener('click', () => showModal('modal-booking'));
  document.getElementById('btn-help')?.addEventListener('click', () => showModal('modal-help'));

  // Camera & Mobile Toolbar controls
  document.getElementById('btn-reset-view')?.addEventListener('click', resetView);
  document.getElementById('btn-mobile-locations')?.addEventListener('click', openDrawer);
  document.getElementById('btn-mobile-menu')?.addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);
  document.getElementById('btn-mobile-map')?.addEventListener('click', () => showModal('modal-minimap'));

  // Drawer experience switchers
  document.getElementById('drawer-tab-campus')?.addEventListener('click', () => {
    setExperienceSection('campus');
  });
  document.getElementById('drawer-tab-hostel')?.addEventListener('click', () => {
    setExperienceSection('hostel');
  });

  // Drawer backdrop dismissal
  document.getElementById('drawer-locations')?.addEventListener('click', (e) => {
    if (e.target.id === 'drawer-locations') {
      closeDrawer();
    }
  });

  // Drawer touch swipe-down to dismiss
  const drawerSheet = document.querySelector('.drawer-sheet');
  if (drawerSheet) {
    let startY = 0;
    drawerSheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    drawerSheet.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > 80) {
        closeDrawer();
      }
    }, { passive: true });
  }

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(e.currentTarget.dataset.close);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.getElementById('form-booking')?.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal('modal-booking');
    showToast('🎉 Visit Appointment Received! We will email your confirmation shortly.');
  });

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    // Search shortcut: Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      showModal('modal-search');
      document.getElementById('global-search-input')?.focus();
      return;
    }

    if (e.key === 'Escape') {
      ['modal-search', 'modal-booking', 'modal-help', 'modal-info', 'modal-welcome', 'modal-minimap'].forEach(closeModal);
      closeDrawer();
    }

    // Directional keys for 360 look
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') targetLon -= 12;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') targetLon += 12;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') targetLat += 8;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') targetLat -= 8;
    if (e.key === '+' || e.key === '=') targetFov = Math.max(35, targetFov - 5);
    if (e.key === '-') targetFov = Math.min(100, targetFov + 5);

    // Number keys for section switch
    if (e.key === '1' && !e.target.matches('input, select, textarea')) setExperienceSection('campus');
    if (e.key === '2' && !e.target.matches('input, select, textarea')) setExperienceSection('hostel');
  });
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
