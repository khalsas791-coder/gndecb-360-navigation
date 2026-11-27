import * as THREE from 'three';
import './style.css';
import './landing.css';
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
export function getSystemZoomOutFov() {
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || window.innerHeight > window.innerWidth);
  return isMobile ? 98 : 92;
}

let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
let lon = 180, onPointerDownLon = 180;
let lat = 0, onPointerDownLat = 0;
let targetLon = 180, targetLat = 0;
let fov = getSystemZoomOutFov(), targetFov = getSystemZoomOutFov();

// Touch, Multi-Touch Pinch-to-Zoom & Inertia/Momentum Tracking (Google Maps Style)
const activePointers = new Map();
let lastPointerX = 0, lastPointerY = 0;
let lastPointerTime = 0;
let velocityLon = 0, velocityLat = 0;
let initialPinchDistance = null;
let pinchStartFov = getSystemZoomOutFov();

// Run initial system diagnostic
runFullDiagnostic();

// ============================================================================
// APP INITIALIZATION & DOM TEMPLATE
// ============================================================================
function initApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    
    <!-- ====================================================================== -->
    <!-- 1. STARTING COLLEGE HOMEPAGE & PORTAL                                 -->
    <!-- ====================================================================== -->
    <div id="landing-portal" class="landing-portal">
      <!-- Institutional Top Sticky Navbar -->
      <header class="landing-nav">
        <div class="nav-container">
          <a href="#hero" class="nav-brand" title="Guru Nanak Dev Engineering College, Bidar">
            <div class="nav-logo-box">
              <img src="/gndec_logo_web.png" alt="GNDEC Bidar Emblem" class="nav-logo-img" />
            </div>
            <div class="nav-brand-text">
              <span class="nav-college-title">GURU NANAK DEV ENGINEERING COLLEGE</span>
              <span class="nav-college-sub">BIDAR, KARNATAKA • ESTD. 1980 • NAAC 'A+' GRADE</span>
            </div>
          </a>

          <ul class="nav-links" id="nav-links-menu">
            <li class="nav-link-item"><a href="#hero">Home</a></li>
            <li class="nav-link-item"><a href="#about-college">About College</a></li>
            <li class="nav-link-item"><a href="#about-project">About Project</a></li>
            <li class="nav-link-item"><a href="#campus-highlights">Highlights</a></li>
            <li class="nav-link-item"><a href="#department-hod">Department & HOD</a></li>
            <li class="nav-link-item nav-link-mobile-cta">
              <button id="btn-nav-mobile-menu-start" class="btn-nav-start" style="width:100%; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                <span>START 360° NAVIGATION</span>
              </button>
            </li>
          </ul>

          <div class="nav-actions">
            <button id="btn-nav-start-tour" class="btn-nav-start desktop-only-start" title="Launch 360° Smart Campus Navigation">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>START NAVIGATION</span>
            </button>
            <button id="btn-nav-mobile-pill" class="btn-nav-mobile-pill" title="Start 360 Navigation">
              <span>360°</span>
            </button>
            <button id="btn-nav-mobile-toggle" class="btn-nav-mobile-toggle" aria-label="Toggle Navigation Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- 1. HERO SECTION -->
      <section class="landing-hero" id="hero">
        <div class="hero-glow-orb"></div>
        <div class="hero-content">
          <!-- Accreditation Tag -->
          <div class="hero-accred-badge">
            <span class="star-icon">⭐</span>
            <span>APPROVED BY AICTE NEW DELHI • AFFILIATED TO VTU BELAGAVI • NAAC 'A+' GRADE • ESTD. 1980</span>
          </div>

          <!-- Official College Logo Crest -->
          <div class="hero-crest-wrapper">
            <img src="/gndec_logo_web.png" alt="Official GNDEC Bidar Crest" class="hero-crest-img" />
          </div>

          <!-- Full College Name -->
          <h1 class="hero-college-name">GURU NANAK DEV ENGINEERING COLLEGE, BIDAR</h1>
          
          <!-- Department Presenter Tag -->
          <div class="hero-dept-tag">DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING (AI&ML)</div>

          <!-- Project Title & Tagline -->
          <div class="hero-project-box">
            <h2 class="hero-project-title">360° SMART CAMPUS NAVIGATION</h2>
            <p class="hero-tagline">"Explore Your Campus Through an Immersive 360° Experience."</p>
          </div>

          <!-- Short Introduction -->
          <p class="hero-college-intro">
            Established in 1980 under the visionary leadership of the Sri Nanak Jhira Saheb Foundation, Guru Nanak Dev Engineering College (GNDEC), Bidar is a premier center of technical education in Karnataka. Set across a lush green campus, GNDEC empowers aspiring engineers with cutting-edge laboratories, industry-ready technical education, innovation mentorship, and holistic student growth.
          </p>

          <!-- Primary Actions Hub -->
          <div class="hero-cta-hub">
            <button id="btn-hero-start-nav" class="btn-hero-primary" title="Launch Full 360° Interactive Campus Navigation">
              <span class="btn-hero-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2 2-6.3z"/></svg>
              </span>
              <span>START NAVIGATION</span>
              <span class="btn-hero-badge">Interactive 360° VR</span>
            </button>

            <div class="hero-quick-jumps">
              <button class="btn-quick-jump" data-scene="campus_2nd_gate" data-section="campus">
                <span>🏛️ Explore Academic Campus</span>
              </button>
              <button class="btn-quick-jump" data-scene="campus_2nd_gate" data-section="hostel">
                <span>🏠 Explore Student Hostels</span>
              </button>
              <button class="btn-quick-jump" data-scene="mb_3f_cse_aiml_hod" data-section="hostel">
                <span>💻 CSE (AI&ML) Department & HOD</span>
              </button>
            </div>
          </div>

          <!-- Key Metrics Strip -->
          <div class="hero-stats-strip">
            <div class="hero-stat-card">
              <span class="stat-number gold">1980</span>
              <span class="stat-label">40+ Years Legacy</span>
            </div>
            <div class="hero-stat-card">
              <span class="stat-number cyan">NAAC A+</span>
              <span class="stat-label">Grade Accreditation</span>
            </div>
            <div class="hero-stat-card">
              <span class="stat-number">30+</span>
              <span class="stat-label">HD 360° Panoramas</span>
            </div>
            <div class="hero-stat-card">
              <span class="stat-number cyan">100% VR</span>
              <span class="stat-label">Street-View Walkthrough</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. ABOUT SECTION (COLLEGE & PROJECT) -->
      <section class="section-about" id="about-college">
        <div class="section-header">
          <span class="section-pill-tag">Institutional Heritage & Innovation</span>
          <h2 class="section-title">About Our College & Project</h2>
          <p class="section-subtitle">
            Discover the legacy of GNDEC Bidar and how our cutting-edge 360° virtual navigation platform empowers students, visitors, and alumni to explore the entire campus virtually.
          </p>
        </div>

        <div class="about-grid">
          <!-- About Our College Card -->
          <div class="about-card" id="about-college-card">
            <div class="about-badge">
              <span>🏛️ Engineering Education Excellence</span>
            </div>
            <h3 class="about-card-title">About Our College</h3>
            <div class="about-card-sub">GURU NANAK DEV ENGINEERING COLLEGE, BIDAR</div>
            <p class="about-text">
              Guru Nanak Dev Engineering College, Bidar was founded in August 1980 by the Prabandhak Committee, Gurudwara Sri Nanak Jhira Saheb under the visionary leadership of founder Sardar Joga Singh Ji. For over four decades, the institution has stood at the forefront of technical learning, producing skilled engineers and innovators globally.
            </p>
            <p class="about-text">
              Permanently affiliated to Visvesvaraya Technological University (VTU), Belagavi, approved by AICTE New Delhi, and accredited by NAAC with a prestigious 'A+' Grade, GNDEC fosters academic rigor, hands-on experiential education, student research, and value-based personal development.
            </p>
            <div class="about-pillars">
              <div class="pillar-item">
                <div class="pillar-icon">🎓</div>
                <div class="pillar-title">VTU Affiliation & AICTE</div>
                <div class="pillar-desc">Comprehensive undergraduate & postgraduate curricula aligned with modern industry benchmarks.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">🔬</div>
                <div class="pillar-title">Advanced Laboratories</div>
                <div class="pillar-desc">Specialized AI/ML computing clusters, robotics labs, CAD suites, and modern workshops.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">🚀</div>
                <div class="pillar-title">Innovation & Research</div>
                <div class="pillar-desc">Student project incubation, technical hackathons, research symposiums, and patent support.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">🌿</div>
                <div class="pillar-title">Holistic Student Growth</div>
                <div class="pillar-desc">Lush 25+ acre green campus, modern hostels, central library, and multi-sport complexes.</div>
              </div>
            </div>
          </div>

          <!-- About Our Project Card -->
          <div class="about-card" id="about-project">
            <div class="about-badge">
              <span>🌐 Immersive Digital Twin</span>
            </div>
            <h3 class="about-card-title">About Our Project</h3>
            <div class="about-card-sub">360° SMART CAMPUS NAVIGATION PLATFORM</div>
            <p class="about-text">
              The 360° Smart Campus Navigation platform is an institutional digital twin engineered to help students, parents, incoming freshmen, visiting dignitaries, and alumni explore Guru Nanak Dev Engineering College and student hostels through interactive, photorealistic panoramic views.
            </p>
            <p class="about-text">
              Eliminating geographic barriers, our platform provides street-view style directional walking, room-by-room inspection, floor elevator directories, and real-time orientation to ensure seamless virtual navigation across both academic blocks and residential facilities.
            </p>
            <div class="about-pillars">
              <div class="pillar-item">
                <div class="pillar-icon">🔄</div>
                <div class="pillar-title">360° Panoramic Panoramas</div>
                <div class="pillar-desc">High-definition equirectangular photography capturing every key academic and hostel viewpoint.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">🧭</div>
                <div class="pillar-title">Street-View Walking</div>
                <div class="pillar-desc">Directional hotspots, glowing arrows, and intuitive D-Pad controls for realistic spatial exploration.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">🏢</div>
                <div class="pillar-title">Dual Campus & Hostel Modes</div>
                <div class="pillar-desc">Dedicated navigation tracks for academic blocks, departments, labs, hostel rooms, mess, and gym.</div>
              </div>
              <div class="pillar-item">
                <div class="pillar-icon">📱</div>
                <div class="pillar-title">Universal Device Access</div>
                <div class="pillar-desc">Zero app installation required; runs natively on mobile smartphones, tablets, and desktop browsers.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. CAMPUS HIGHLIGHTS SHOWCASE -->
      <section class="section-highlights" id="campus-highlights">
        <div class="section-header">
          <span class="section-pill-tag">Interactive Destinations</span>
          <h2 class="section-title">Explore Key Campus Highlights</h2>
          <p class="section-subtitle">
            Jump directly into any academic landmark or residential facility in high-definition 360° virtual reality.
          </p>
        </div>

        <div class="highlights-grid">
          <div class="highlight-card">
            <div class="highlight-icon-box">🏛️</div>
            <h4 class="highlight-card-title">Academic Main Block</h4>
            <p class="highlight-card-desc">Experience the multi-level institutional atrium, administrative offices, dean chambers, and lecture halls.</p>
            <button class="btn-card-launch" data-scene="campus_2nd_gate" data-section="campus">
              <span>Explore Main Block</span>
              <span>→</span>
            </button>
          </div>

          <div class="highlight-card">
            <div class="highlight-icon-box">💻</div>
            <h4 class="highlight-card-title">CSE (AI&ML) Department</h4>
            <p class="highlight-card-desc">Visit the specialized AI&ML computational laboratories, department faculty rooms, and HOD Office.</p>
            <button class="btn-card-launch" data-scene="mb_3f_cse_aiml_hod" data-section="hostel">
              <span>Explore CSE(AI&ML)</span>
              <span>→</span>
            </button>
          </div>

          <div class="highlight-card">
            <div class="highlight-icon-box">📚</div>
            <h4 class="highlight-card-title">Central Multi-Level Library</h4>
            <p class="highlight-card-desc">Browse through 1st and 2nd floor library reading halls, digital repository portals, and reference sections.</p>
            <button class="btn-card-launch" data-scene="first_floor_library" data-section="hostel">
              <span>Explore Library</span>
              <span>→</span>
            </button>
          </div>

          <div class="highlight-card">
            <div class="highlight-icon-box">🎭</div>
            <h4 class="highlight-card-title">University Auditorium</h4>
            <p class="highlight-card-desc">Tour the grand university auditorium hosting national symposiums, technical summits, and cultural fests.</p>
            <button class="btn-card-launch" data-scene="campus_auditorium" data-section="campus">
              <span>Explore Auditorium</span>
              <span>→</span>
            </button>
          </div>

          <div class="highlight-card">
            <div class="highlight-icon-box">🏠</div>
            <h4 class="highlight-card-title">Student Hostels & Mess</h4>
            <p class="highlight-card-desc">Walk through the reception lobby, dining hall, indoor gymnasiums, and student residential corridors.</p>
            <button class="btn-card-launch" data-scene="lobby_hub" data-section="hostel">
              <span>Explore Hostels</span>
              <span>→</span>
            </button>
          </div>

          <div class="highlight-card">
            <div class="highlight-icon-box">🛕</div>
            <h4 class="highlight-card-title">Gurudwara Sahib</h4>
            <p class="highlight-card-desc">Experience the serene spiritual sanctum and prayer hall located on the 5th floor of the campus complex.</p>
            <button class="btn-card-launch" data-scene="f5_gurudwara" data-section="hostel">
              <span>Explore Gurudwara</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 4. DEPARTMENT AND HOD SECTION -->
      <section class="section-department" id="department-hod">
        <div class="section-header">
          <span class="section-pill-tag">Academic Department & Leadership</span>
          <h2 class="section-title">Department & Faculty Leadership</h2>
          <p class="section-subtitle">
            Center for Advanced Computing, Artificial Intelligence & Machine Learning at Guru Nanak Dev Engineering College, Bidar.
          </p>
        </div>

        <div class="department-banner">
          <!-- Department Information -->
          <div class="dept-info">
            <div class="dept-pill">
              <span>⚡ Academic Innovation Hub</span>
            </div>
            <h3 class="dept-title">DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING (AI&ML)</h3>
            <div class="dept-subtitle">Guru Nanak Dev Engineering College, Bidar</div>
            <p class="dept-desc">
              The Department of Computer Science and Engineering (Artificial Intelligence and Machine Learning) is dedicated to preparing future-ready engineers capable of driving next-generation computational breakthroughs. Our curriculum integrates theoretical foundations with intensive practical application in machine learning algorithms, deep learning neural networks, computer vision, natural language processing, and autonomous intelligent systems.
            </p>
            <div class="dept-bullets">
              <div class="dept-bullet-item">
                <span class="bullet-dot"></span>
                <span>GPU-Accelerated AI Laboratories</span>
              </div>
              <div class="dept-bullet-item">
                <span class="bullet-dot"></span>
                <span>Industry-Aligned Machine Learning Projects</span>
              </div>
              <div class="dept-bullet-item">
                <span class="bullet-dot"></span>
                <span>Student Research & Patent Incubation</span>
              </div>
              <div class="dept-bullet-item">
                <span class="bullet-dot"></span>
                <span>Active Global Alumni Mentorship Network</span>
              </div>
            </div>
          </div>

          <!-- Professional Faculty Profile Card for HOD -->
          <div class="faculty-profile-card">
            <div class="faculty-card-header-badge">Leadership</div>
            
            <!-- Faculty Avatar / Monogram Crest -->
            <div class="faculty-avatar-wrap">
              <div class="faculty-avatar-inner">
                <span class="faculty-avatar-icon">👨‍🏫</span>
                <span class="faculty-monogram">PR</span>
              </div>
            </div>

            <span class="faculty-designation-pill">Head of Department</span>
            <h3 class="faculty-name">Mr. Praveen Reddy</h3>
            <p class="faculty-role-title">Department of Computer Science and Engineering (AI&ML)</p>
            <p class="faculty-institution">Guru Nanak Dev Engineering College, Bidar</p>

            <!-- Additional Responsibility Badge -->
            <div class="faculty-responsibility-box">
              <span class="resp-icon">⭐</span>
              <div class="resp-text">
                <span class="resp-label">Additional Responsibility</span>
                <strong class="resp-title">Head of Alumni</strong>
              </div>
            </div>

            <p class="faculty-bio">
              Guiding the Department of CSE (AI&ML) towards academic rigor, technical research, and cutting-edge innovations in artificial intelligence, while fostering lifelong global connections through the GNDEC Alumni Association.
            </p>

            <button class="btn-faculty-tour" data-scene="mb_3f_cse_aiml_hod" data-section="hostel" title="Directly View HOD Office in 360°">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>Take 360° Tour of HOD Office & AI Lab</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 5. INSTITUTIONAL FOOTER -->
      <footer class="landing-footer">
        <div class="footer-container">
          <div class="footer-top-grid">
            <!-- Brand Column -->
            <div class="footer-col-brand">
              <div class="footer-brand-header">
                <div class="footer-logo-box">
                  <img src="/gndec_logo_web.png" alt="GNDEC Logo" class="footer-logo-img" />
                </div>
                <div>
                  <div class="footer-brand-title">Guru Nanak Dev Engineering College, Bidar</div>
                  <div class="footer-dept-tag">Department of CSE (AI&ML)</div>
                </div>
              </div>
              <p class="footer-brand-desc">
                Official 360° Smart Campus Navigation Platform. Designed to deliver an immersive, photorealistic virtual exploration of college academic blocks, computing labs, central library, and student hostels.
              </p>
              <div class="footer-credit-badge">
                <span>✨ Designed and Developed by CSE (AI&ML) Department</span>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h4 class="footer-col-title">Quick Navigation</h4>
              <ul class="footer-links-list">
                <li><a href="#hero"><span>›</span> Home Portal</a></li>
                <li><a href="#about-college"><span>›</span> About Our College</a></li>
                <li><a href="#about-project"><span>›</span> About 360° Project</a></li>
                <li><a href="#campus-highlights"><span>›</span> Campus Highlights</a></li>
                <li><a href="#department-hod"><span>›</span> Department & HOD</a></li>
              </ul>
            </div>

            <!-- Campus Highlights Links -->
            <div>
              <h4 class="footer-col-title">Virtual 360° Views</h4>
              <ul class="footer-links-list">
                <li><a href="javascript:void(0)" class="footer-scene-link" data-scene="campus_2nd_gate" data-section="campus"><span>›</span> Academic Block</a></li>
                <li><a href="javascript:void(0)" class="footer-scene-link" data-scene="mb_3f_cse_aiml_hod" data-section="hostel"><span>›</span> CSE (AI&ML) Department</a></li>
                <li><a href="javascript:void(0)" class="footer-scene-link" data-scene="first_floor_library" data-section="hostel"><span>›</span> Central Library</a></li>
                <li><a href="javascript:void(0)" class="footer-scene-link" data-scene="lobby_hub" data-section="hostel"><span>›</span> Student Hostel Lobby</a></li>
                <li><a href="javascript:void(0)" class="footer-scene-link" data-scene="f5_gurudwara" data-section="hostel"><span>›</span> Gurudwara Sahib</a></li>
              </ul>
            </div>

            <!-- Institutional Details -->
            <div>
              <h4 class="footer-col-title">Institutional Info</h4>
              <div class="footer-info-item">
                <span class="footer-info-icon">📍</span>
                <span>Guru Nanak Dev Engineering College, Mailoor Road, Bidar, Karnataka - 585403, India</span>
              </div>
              <div class="footer-info-item">
                <span class="footer-info-icon">🏛️</span>
                <span>Affiliated to Visvesvaraya Technological University (VTU), Belagavi</span>
              </div>
              <div class="footer-info-item">
                <span class="footer-info-icon">🎖️</span>
                <span>Approved by AICTE New Delhi • NAAC 'A+' Grade Accredited</span>
              </div>
              <div class="footer-info-item">
                <span class="footer-info-icon">🌐</span>
                <span>Official Portal: gndecb.ac.in</span>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="footer-bottom-copy">
              © 2026 <strong>Guru Nanak Dev Engineering College, Bidar</strong>. All rights reserved.
            </div>
            <div class="footer-bottom-credit">
              360° Smart Campus Navigation • Designed and Developed by CSE (AI&ML) Department
            </div>
          </div>
        </div>
      </footer>
    </div>

    <!-- ====================================================================== -->
    <!-- 2. 360° TOUR VIEWER ENGINE (FULL EXISTING VR SYSTEM)                  -->
    <!-- ====================================================================== -->
    <div id="tour-viewer" class="tour-viewer hidden">

    <!-- WebGL Canvas for 360 Panorama -->
    <canvas id="webgl-canvas"></canvas>

    <!-- Top & Bottom Gradient Vignette for UI contrast over bright skies & dark foliage -->
    <div class="tour-vignette" aria-hidden="true"></div>

    <!-- Smooth Loading Curtain & Skeleton -->
    <div id="scene-loader-curtain" class="scene-loader-curtain">
      <div id="loader-curtain-bg" class="loader-curtain-bg"></div>
      <div class="loader-curtain-vignette"></div>
      <div class="loader-curtain-content">
        <div class="loader-spinner-ring"></div>
        <div class="loader-node-label" id="loader-node-label">Loading 360° Scene...</div>
        <div class="loader-node-sub" id="loader-node-sub">HD Panorama</div>
      </div>
    </div>

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
        <!-- Google Maps Mobile Capsule (visible on mobile only) -->
        <div class="header-search-capsule" id="header-search-capsule" role="button" tabindex="0" title="Tap to search any campus facility">
          <div class="capsule-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div class="capsule-text">
            <span class="capsule-title" id="mobile-scene-title">Campus 2nd Gate</span>
            <span class="capsule-sub" id="mobile-scene-sub">Campus 360° • Tap to search</span>
          </div>
        </div>

        <div class="brand-section" id="btn-brand-home" title="GNDECB Virtual Tour Home">
          <div class="brand-logo" style="background:#ffffff; padding:2px;"><img src="/gndec_logo_web.png" alt="GNDEC" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;" /></div>
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
          <!-- Return to College Portal Button -->
          <button id="btn-return-portal" class="btn-portal-return" title="Return to College Portal Homepage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span class="portal-btn-label">College Portal</span>
          </button>

          <!-- Mobile Micro Mode Switcher (visible on mobile only) -->
          <div class="experience-switcher-micro" id="mobile-mode-switcher">
            <button type="button" class="exp-micro-btn ${currentSection === 'campus' ? 'active' : ''}" data-mode="campus" title="Switch to Campus 360°">🏛️</button>
            <button type="button" class="exp-micro-btn ${currentSection === 'hostel' ? 'active' : ''}" data-mode="hostel" title="Switch to Hostel 360°">🏠</button>
          </div>

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

          <!-- Mobile Quick Drawer & Menu Buttons -->
          <button id="btn-mobile-drawer" class="icon-btn mobile-only-btn" title="Locations & Floors Directory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
            <span class="dock-tooltip">Directory & Floors</span>
          </button>

          <button id="btn-mobile-more" class="icon-btn mobile-only-btn" title="Search & Guide">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
            <span class="dock-tooltip">Menu</span>
          </button>
        </div>
      </header>

      <!-- Google Maps Vertical Level / Floor Selector (Mobile only) -->
      <div class="mobile-floor-picker" id="mobile-floor-picker" aria-label="Floor Level Selector"></div>

      <!-- Google Maps Bottom Place Sheet (Mobile only) -->
      <div class="mobile-place-sheet" id="mobile-place-sheet">
        <div class="place-sheet-handle"></div>
        <div class="place-sheet-main">
          <div class="place-sheet-info" id="place-sheet-info" role="button" tabindex="0">
            <div class="place-sheet-title-row">
              <h3 class="place-sheet-title" id="place-sheet-title">Campus 2nd Gate</h3>
              <span class="place-sheet-badge" id="place-sheet-badge">Campus</span>
            </div>
            <p class="place-sheet-sub" id="place-sheet-sub">Secondary Access Gate & Sports Complex Approach</p>
          </div>
          <div class="place-sheet-actions">
            <button type="button" class="sheet-action-pill primary" id="sheet-btn-explore" title="Open All Locations">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
              <span>Explore</span>
            </button>
            <button type="button" class="sheet-action-pill" id="sheet-btn-search" title="Search Campus">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search</span>
            </button>
            <button type="button" class="sheet-action-pill compass-pill" id="sheet-btn-north" title="Reorient to True North">
              <div class="mini-compass-icon" id="mini-compass-dial">
                <div class="mini-compass-needle"></div>
              </div>
              <span id="sheet-heading-label">180° S</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Side Quick Jump Panel (Elevator / Campus Directory) -->
      <aside class="elevator-panel" id="side-navigation-panel"></aside>
      
      <!-- Mobile Drawer Backdrop Overlay -->
      <div id="mobile-drawer-backdrop" class="drawer-backdrop"></div>

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
        </div>

        <!-- Interactive 2D Minimap -->
        <div class="minimap-card" id="minimap-floating-card">
          <div class="minimap-header">
            <div class="minimap-title-wrap">
              <span class="minimap-radar-dot"></span>
              <span id="minimap-section-tag">Campus Layout</span>
            </div>
            <span id="minimap-level">GATE 2</span>
          </div>
          <div class="minimap-body">
            <svg class="minimap-svg" viewBox="0 0 100 100" id="minimap-svg-canvas">
              <defs>
                <linearGradient id="route-blue-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#00f0ff" />
                  <stop offset="50%" stop-color="#2563eb" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="92" height="92" rx="6" fill="rgba(8, 14, 28, 0.75)" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" />
              <path d="M 4,32 L 96,32 M 4,68 L 96,68 M 32,4 L 32,96 M 68,4 L 68,96" stroke="rgba(255,255,255,0.06)" stroke-width="0.8" stroke-dasharray="2,2" />
              
              <!-- Campus landmarks -->
              <rect x="8" y="8" width="22" height="16" rx="2" fill="rgba(0, 240, 255, 0.08)" stroke="rgba(0, 240, 255, 0.25)" stroke-width="0.8" />
              <text x="19" y="18" fill="rgba(255,255,255,0.4)" font-size="3.5" font-weight="600" text-anchor="middle">GATE 1</text>
              
              <rect x="70" y="8" width="22" height="20" rx="2" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="0.8" />
              <text x="81" y="19" fill="rgba(255,255,255,0.4)" font-size="3.5" font-weight="600" text-anchor="middle">MAIN BLOCK</text>
              
              <rect x="8" y="70" width="22" height="20" rx="2" fill="rgba(0, 240, 255, 0.15)" stroke="rgba(0, 240, 255, 0.4)" stroke-width="0.8" />
              <text x="19" y="81" fill="rgba(0, 240, 255, 0.9)" font-size="3.5" font-weight="bold" text-anchor="middle">GATE 2</text>
              
              <rect x="68" y="68" width="24" height="22" rx="2" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="0.8" />
              <text x="80" y="80" fill="rgba(255,255,255,0.4)" font-size="3.5" font-weight="600" text-anchor="middle">HOSTEL</text>
              
              <circle cx="50" cy="50" r="13" fill="rgba(37, 99, 235, 0.08)" stroke="rgba(37, 99, 235, 0.2)" stroke-width="0.8" />
              <text x="50" y="51" fill="rgba(255,255,255,0.35)" font-size="3.2" text-anchor="middle">AVENUE</text>

              <!-- Route Path: Blue Glowing Path -->
              <path id="minimap-route-glow" d="M 19,80 L 28,76 L 38,68 L 48,52 L 54,42 L 62,32 L 75,20 L 81,18" fill="none" stroke="rgba(0, 240, 255, 0.45)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
              <path id="minimap-route-line" d="M 19,80 L 28,76 L 38,68 L 48,52 L 54,42 L 62,32 L 75,20 L 81,18" fill="none" stroke="url(#route-blue-grad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              
              <!-- Waypoints on the blue route line -->
              <circle cx="19" cy="80" r="2.2" fill="#00f0ff" stroke="#ffffff" stroke-width="0.8" />
              <circle cx="28" cy="76" r="1.5" fill="#38bdf8" />
              <circle cx="38" cy="68" r="1.5" fill="#38bdf8" />
              <circle cx="48" cy="52" r="1.5" fill="#38bdf8" />
              <circle cx="54" cy="42" r="1.5" fill="#38bdf8" />
              <circle cx="62" cy="32" r="1.5" fill="#38bdf8" />
              <circle cx="75" cy="20" r="1.5" fill="#38bdf8" />
              <circle cx="81" cy="18" r="2.2" fill="#2563eb" stroke="#ffffff" stroke-width="0.8" />
            </svg>
            <div id="minimap-cone" class="minimap-cone"></div>
            <div id="minimap-pin" class="minimap-pin">
              <span class="minimap-pin-pulse"></span>
            </div>
          </div>
        </div>
      </footer>
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
    </div> <!-- Close #tour-viewer -->
  `;

  updateAudioIcon();
  renderSceneQuickBar();
  renderSidePanel();
  initThreeViewer();
  setupEventListeners();
  setupPortalEventListeners();
  loadScene(currentSceneId);
  handleInitialRoute();
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

  // High-fidelity sphere geometry: 128 x 96 segments eliminates geometric polygon distortion
  const geometry = new THREE.SphereGeometry(500, 128, 96);
  geometry.scale(-1, 1, 1); // Invert sphere so texture displays on inner surface

  textureLoader = new THREE.TextureLoader();

  // Create base material with default white color so textures render at full natural brightness
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);

  // WebGL Renderer configured for high-performance and sharp native display pixel ratio
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onWindowResize);
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
  document.querySelectorAll('.exp-micro-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === section);
  });

  // Update brand header
  const appMainTitle = document.getElementById('app-main-title');
  if (appMainTitle) {
    appMainTitle.textContent = section === 'campus' ? 'GNDECB CAMPUS 360°' : 'GNDECB HOSTEL 360°';
  }

  renderSceneQuickBar();
  renderSidePanel();

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
 * Render Google Maps vertical indoor level / floor selector for mobile
 */
function renderMobileFloorPicker() {
  const container = document.getElementById('mobile-floor-picker');
  if (!container) return;

  if (currentSection === 'hostel') {
    const levels = [
      { id: 'f5_entrance', label: '5', title: 'Floor 5 & Gurudwara Sahib', scenes: ['f5_entrance', 'f5_corridor1', 'f5_corridor2', 'f5_corridor3', 'f5_corridor7', 'f5_corridor8', 'f5_gurudwara', 'room_525'] },
      { id: 'floor4', label: '4', title: 'Floor 4 Corridor', scenes: ['floor4'] },
      { id: 'floor3', label: '3', title: 'Floor 3 Residence Corridor', scenes: ['floor3'] },
      { id: 'floor2', label: '2', title: 'Floor 2 Residence Corridor', scenes: ['floor2', 'f2_entrance', 'f2_corridor1', 'f2_corridor2', 'f2_corridor3'] },
      { id: 'lobby', label: 'G', title: 'Ground Floor Lobby & Reception', scenes: ['lobby', 'exterior', 'outer_gym', 'gate0', 'gate1', 'gate2', 'way_to_gym', 'main_gym'] },
      { id: 'mess', label: 'M', title: 'Hostel Dining Hall & Mess', scenes: ['mess', 'mess2'] }
    ];

    container.innerHTML = levels.map(lvl => {
      const isActive = lvl.scenes.includes(currentSceneId);
      return `
        <button type="button" class="floor-level-btn ${isActive ? 'active' : ''}" data-scene="${lvl.id}" title="${lvl.title}">
          <span>${lvl.label}</span>
        </button>
      `;
    }).join('');
  } else {
    const levels = [
      { id: 'campus_main_gate', label: 'MG', title: 'College Main Gate', scenes: ['campus_main_gate'] },
      { id: 'campus_second_gate', label: '2G', title: 'College 2nd Gate', scenes: ['campus_second_gate', 'campus_parking'] },
      { id: 'campus_main_block', label: 'MB', title: 'Main Academic Block', scenes: ['campus_main_block'] },
      { id: 'campus_canteen', label: 'CAN', title: 'Central Canteen', scenes: ['campus_canteen'] },
      { id: 'campus_auditorium', label: 'AUD', title: 'University Auditorium', scenes: ['campus_auditorium'] },
      { id: 'campus_ground', label: 'GRD', title: 'Athletics Ground', scenes: ['campus_ground', 'campus_sports_room'] }
    ];

    container.innerHTML = levels.map(lvl => {
      const isActive = lvl.scenes.includes(currentSceneId);
      return `
        <button type="button" class="floor-level-btn ${isActive ? 'active' : ''}" data-scene="${lvl.id}" title="${lvl.title}">
          <span>${lvl.label}</span>
        </button>
      `;
    }).join('');
  }
}

/**
 * Update Google Maps mobile place sheet with current scene details
 */
function updateMobilePlaceSheet(viewpoint) {
  if (!viewpoint) return;
  const title = document.getElementById('place-sheet-title');
  if (title) title.textContent = viewpoint.name;

  const badge = document.getElementById('place-sheet-badge');
  if (badge) {
    badge.textContent = viewpoint.floorLabel || (currentSection === 'campus' ? 'Campus' : 'Hostel');
  }

  const sub = document.getElementById('place-sheet-sub');
  if (sub) {
    sub.textContent = viewpoint.subtitle || (viewpoint.category ? `${viewpoint.category} • GNDEC Bidar` : 'Guru Nanak Dev Engineering College');
  }
}

/**
 * Reorient camera view smoothly to True North (0° N, 0° lat) like Google Maps
 */
function reorientToNorth() {
  const norm = ((lon % 360) + 360) % 360;
  const destLon = norm > 180 ? 360 : 0;
  targetLon = lon + (destLon - norm);
  targetLat = 0;
  showToast('🧭 Reoriented to True North (0° N)');
}

/**
 * High-Performance Asynchronous Texture Loader with Memory Caching
 * Optimized for maximum photo sphere quality: mipmaps enabled, linear mipmap filtering, anisotropy = 16
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
        // PHOTO SPHERE VIEWER OPTIMIZATIONS:
        // 1. Enable mipmaps to eliminate shimmering and pixelation when zoomed out
        texture.generateMipmaps = true;
        // 2. Linear mipmap linear minFilter for sharpest, smoothest texture filtering
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        // 3. Set anisotropy to 16 to keep edges razor-sharp at oblique angles
        const maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
        texture.anisotropy = Math.min(16, maxAniso || 16);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

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
 * Predictive background preloader: eagerly preloads connected neighbor textures
 * so navigation clicks resolve with 0ms instantaneous cache hits
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

  setTimeout(() => {
    neighborIds.forEach(id => {
      const nextVp = getViewpoint(id);
      if (nextVp && nextVp.hasImage && nextVp.image && !textureCache.has(nextVp.image)) {
        getOrLoadTexture(nextVp.image).catch(() => {});
      }
    });
  }, 30);
}

/**
 * Smoothly apply texture to the 360 sphere without visual stutter
 * Automatically aligns camera yaw and pitch down the pathway
 */
function applySceneTexture(texture, viewpoint, arrivalHeading = null) {
  sphereMesh.material.color.setHex(0xffffff);
  sphereMesh.material.map = texture;
  sphereMesh.material.needsUpdate = true;
  
  // Floor/building transitions: automatically points camera straight down the path
  let newLon = 180;
  if (arrivalHeading !== null && arrivalHeading !== undefined) {
    newLon = arrivalHeading;
  } else if (viewpoint.yaw !== undefined) {
    newLon = viewpoint.yaw;
  } else if (viewpoint.targetHeading !== undefined) {
    newLon = viewpoint.targetHeading;
  } else if (viewpoint.initialLon !== undefined) {
    newLon = viewpoint.initialLon;
  }

  let newLat = 0;
  if (viewpoint.pitch !== undefined) {
    newLat = viewpoint.pitch;
  } else if (viewpoint.initialLat !== undefined) {
    newLat = viewpoint.initialLat;
  }

  // Instantly lock camera heading to target direction so user doesn't have to manually look for the path
  lon = newLon;
  targetLon = newLon;
  lat = newLat;
  targetLat = newLat;
  velocityLon = 0;
  velocityLat = 0;

  updateMinimapPin();
  renderHotspots();
}

/**
 * Load a specific viewpoint with instant cache delivery, blurred loading skeleton curtain,
 * and smooth crossfades
 */
export function loadScene(sceneId, arrivalHeading = null) {
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
  }

  currentSceneId = sceneId;
  targetFov = getSystemZoomOutFov();
  if (currentSection === 'campus') {
    lastVisitedCampusScene = sceneId;
  } else {
    lastVisitedHostelScene = sceneId;
  }

  // Update Header details
  const sceneTitleHeader = document.getElementById('scene-title-header');
  if (sceneTitleHeader) sceneTitleHeader.textContent = targetViewpoint.name;

  // Update Google Maps mobile capsule details
  const mobileSceneTitle = document.getElementById('mobile-scene-title');
  if (mobileSceneTitle) mobileSceneTitle.textContent = targetViewpoint.name;
  const mobileSceneSub = document.getElementById('mobile-scene-sub');
  if (mobileSceneSub) {
    const floorInfo = targetViewpoint.floorLabel || (currentSection === 'campus' ? 'Campus 360°' : 'Hostel 360°');
    mobileSceneSub.textContent = `${floorInfo} • Tap to search`;
  }

  // Update Google Maps mobile floor selector and bottom sheet
  updateMobilePlaceSheet(targetViewpoint);
  renderMobileFloorPicker();

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

  // Update Directional D-Pad controls
  updateDPadControls(targetViewpoint);

  // Handle Real Panorama vs Pending Panorama
  const pendingOverlay = document.getElementById('panorama-pending-overlay');
  const webglCanvas = document.getElementById('webgl-canvas');
  const loaderCurtain = document.getElementById('scene-loader-curtain');
  const loaderCurtainBg = document.getElementById('loader-curtain-bg');
  const loaderNodeLabel = document.getElementById('loader-node-label');
  const loaderNodeSub = document.getElementById('loader-node-sub');

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
      if (loaderCurtain) loaderCurtain.classList.remove('active');
      applySceneTexture(textureCache.get(imageUrl), targetViewpoint, arrivalHeading);
      preloadNeighbors(targetViewpoint);
      return;
    }

    // Clear previous hotspots immediately so old arrows don't linger while new scene loads
    const hotspotsContainer = document.getElementById('hotspots-overlay');
    if (hotspotsContainer) hotspotsContainer.innerHTML = '';

    // Show dark, blurred CSS background skeleton of the image and centered spinner
    if (loaderCurtain) {
      if (loaderCurtainBg) {
        loaderCurtainBg.style.backgroundImage = `url("${imageUrl}")`;
      }
      if (loaderNodeLabel) {
        loaderNodeLabel.textContent = targetViewpoint.name;
      }
      if (loaderNodeSub) {
        loaderNodeSub.textContent = targetViewpoint.subtitle || 'High-Definition Panorama';
      }
      loaderCurtain.classList.add('active');
    }

    // Secondary status pill if loading takes longer than 250ms
    if (loaderTimeout) clearTimeout(loaderTimeout);
    loaderTimeout = setTimeout(() => {
      if (activeLoadToken === thisLoadToken) {
        showLoader(true, `Loading 360° view for ${targetViewpoint.name}...`);
      }
    }, 250);

    getOrLoadTexture(imageUrl)
      .then((texture) => {
        if (activeLoadToken !== thisLoadToken) return;
        if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
        showLoader(false);

        // Apply texture and camera heading alignment
        applySceneTexture(texture, targetViewpoint, arrivalHeading);
        preloadNeighbors(targetViewpoint);

        // Crossfade to new 360 node only once high-res texture is fully loaded
        if (loaderCurtain) {
          loaderCurtain.classList.remove('active');
        }
      })
      .catch((err) => {
        if (activeLoadToken !== thisLoadToken) return;
        if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
        console.warn(`[TextureLoader] Image failed to load at ${imageUrl}:`, err);
        showLoader(false);
        if (loaderCurtain) {
          loaderCurtain.classList.remove('active');
        }
        showToast(`Image not found at ${imageUrl}`);
      });
  } else {
    // Pending Panorama state (e.g. campus location awaiting photography)
    if (loaderTimeout) { clearTimeout(loaderTimeout); loaderTimeout = null; }
    showLoader(false);
    if (loaderCurtain) {
      loaderCurtain.classList.remove('active');
    }
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
          <div class="hotspot-title">${hs.title}</div>
          <span class="hotspot-sub">${hs.subtitle}</span>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="hotspot-pulse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <div class="hotspot-label">
          <div class="hotspot-title">${hs.title}</div>
          <span class="hotspot-sub">${hs.subtitle}</span>
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
        loadScene(hs.targetScene, hs.targetHeading);
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
  isUserInteracting = true;
  velocityLon = 0;
  velocityLat = 0;

  if (activePointers.size === 1) {
    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = performance.now();
  } else if (activePointers.size === 2) {
    // Multi-touch pinch-to-zoom initialization
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

  if (activePointers.size === 1) {
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerTime);
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;

    // Fast, responsive Street View pan sensitivity (0.32 on touch, 0.24 on mouse)
    const dragSensitivity = event.pointerType === 'touch' ? 0.32 : 0.24;

    // Calculate angular velocity (degrees/ms) for smooth momentum release
    velocityLon = -(dx * dragSensitivity) / dt;
    velocityLat = (dy * dragSensitivity) / dt;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = now;

    targetLon = (onPointerDownMouseX - event.clientX) * dragSensitivity + onPointerDownLon;
    targetLat = (event.clientY - onPointerDownMouseY) * dragSensitivity + onPointerDownLat;
  } else if (activePointers.size === 2 && initialPinchDistance) {
    // Multi-touch pinch-to-zoom calculation
    const pts = Array.from(activePointers.values());
    const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (initialPinchDistance > 10 && currentDist > 10) {
      const pinchRatio = initialPinchDistance / currentDist;
      targetFov = Math.max(35, Math.min(108, pinchStartFov * pinchRatio));
    }
  }
}

function onPointerUp(event) {
  activePointers.delete(event.pointerId);

  if (activePointers.size === 0) {
    isUserInteracting = false;
    initialPinchDistance = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    // Limit maximum flick velocity for natural Street View feel
    const maxVelocity = 0.65;
    velocityLon = Math.max(-maxVelocity, Math.min(maxVelocity, velocityLon));
    velocityLat = Math.max(-maxVelocity, Math.min(maxVelocity, velocityLat));
  } else if (activePointers.size === 1) {
    // Reset drag reference to remaining pointer
    const remaining = Array.from(activePointers.values())[0];
    onPointerDownMouseX = remaining.x;
    onPointerDownMouseY = remaining.y;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    lastPointerX = remaining.x;
    lastPointerY = remaining.y;
    lastPointerTime = performance.now();
    initialPinchDistance = null;
  }
}

function onDocumentMouseWheel(event) {
  event.preventDefault();
  targetFov = Math.max(35, Math.min(108, targetFov + event.deltaY * 0.05));
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  if (targetFov >= 85) {
    targetFov = getSystemZoomOutFov();
  }
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderHotspots();
}

function animate() {
  requestAnimationFrame(animate);

  if (!isUserInteracting) {
    // Street View momentum with 0.94 friction decay
    if (Math.abs(velocityLon) > 0.001) {
      targetLon += velocityLon * 16;
      velocityLon *= 0.94;
    } else {
      velocityLon = 0;
    }

    if (Math.abs(velocityLat) > 0.001) {
      targetLat += velocityLat * 16;
      velocityLat *= 0.94;
    } else {
      velocityLat = 0;
    }

    if (isAutoRotating && Math.abs(velocityLon) < 0.01) {
      targetLon += 0.08;
    }
  }

  // Shortest angular difference wrapping prevents slow 360-degree multi-second rotations
  let diffLon = (targetLon - lon) % 360;
  if (diffLon > 180) diffLon -= 360;
  if (diffLon < -180) diffLon += 360;
  lon += diffLon * 0.35;

  lat += (targetLat - lat) * 0.35;
  fov += (targetFov - fov) * 0.25;

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
  const miniCompassDial = document.getElementById('mini-compass-dial');
  const sheetHeadingLabel = document.getElementById('sheet-heading-label');

  if (compassDial) compassDial.style.transform = `rotate(${-normAngle}deg)`;
  if (miniCompassDial) miniCompassDial.style.transform = `rotate(${-normAngle}deg)`;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirIdx = Math.round(normAngle / 45) % 8;
  const headingText = `${Math.round(normAngle)}° ${directions[dirIdx]}`;

  if (compassHeading) compassHeading.textContent = headingText;
  if (sheetHeadingLabel) sheetHeadingLabel.textContent = headingText;

  const minimapCone = document.getElementById('minimap-cone');
  if (minimapCone) minimapCone.style.transform = `translate(-50%, -100%) rotate(${normAngle}deg)`;
}

function updateMinimapPin() {
  const pin = document.getElementById('minimap-pin');
  const cone = document.getElementById('minimap-cone');
  const levelText = document.getElementById('minimap-level');
  const sectionTag = document.getElementById('minimap-section-tag');
  
  const viewpoint = getViewpoint(currentSceneId);
  if (!viewpoint) return;

  const pos = viewpoint.minimapPos;
  if (pin && cone && pos) {
    pin.style.top = pos.top;
    pin.style.left = pos.left;
    cone.style.top = pos.top;
    cone.style.left = pos.left;
  }
  if (levelText) {
    levelText.textContent = viewpoint.floorLabel || currentSceneId.toUpperCase();
  }
  if (sectionTag) {
    sectionTag.textContent = currentSection === 'campus' ? 'Campus Layout' : 'Hostel Layout';
  }
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
      closeMobileDrawer();
    }
  });

  // Mobile Drawer Toggle & Backdrop Controls
  const mobileDrawer = document.getElementById('side-navigation-panel');
  const mobileBackdrop = document.getElementById('mobile-drawer-backdrop');

  const closeMobileDrawer = () => {
    mobileDrawer?.classList.remove('mobile-open');
    mobileBackdrop?.classList.remove('active');
  };

  document.getElementById('btn-mobile-drawer')?.addEventListener('click', () => {
    const willOpen = !mobileDrawer?.classList.contains('mobile-open');
    mobileDrawer?.classList.toggle('mobile-open', willOpen);
    mobileBackdrop?.classList.toggle('active', willOpen);
  });

  mobileBackdrop?.addEventListener('click', closeMobileDrawer);

  document.getElementById('btn-mobile-more')?.addEventListener('click', () => {
    showModal('modal-help');
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
    btn.addEventListener('pointerenter', (e) => {
      const targetId = e.currentTarget.dataset.target;
      if (targetId) {
        const targetVp = getViewpoint(targetId);
        if (targetVp && targetVp.hasImage && targetVp.image && !textureCache.has(targetVp.image)) {
          getOrLoadTexture(targetVp.image);
        }
      }
    });

    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.target;
      const turnDir = e.currentTarget.dataset.turn;
      if (targetId) {
        const currVp = getViewpoint(currentSceneId);
        let heading = null;
        if (currVp && currVp.hotspots) {
          const matchHs = currVp.hotspots.find(h => h.targetScene === targetId);
          if (matchHs && matchHs.targetHeading !== undefined) {
            heading = matchHs.targetHeading;
          }
        }
        loadScene(targetId, heading);
      } else if (turnDir) {
        if (turnDir === 'left') targetLon -= 45;
        if (turnDir === 'right') targetLon += 45;
        if (turnDir === 'back') targetLon += 180;
        if (turnDir === 'forward') targetLat = 0;
      }
    });
  });

  // Search Modal Trigger & Input
  const openSearchModal = () => {
    showModal('modal-search');
    const input = document.getElementById('global-search-input');
    if (input) {
      input.focus();
      handleSearchInput(input.value);
    }
  };

  document.getElementById('btn-search-trigger')?.addEventListener('click', openSearchModal);
  document.getElementById('header-search-capsule')?.addEventListener('click', openSearchModal);
  document.getElementById('sheet-btn-search')?.addEventListener('click', openSearchModal);

  document.getElementById('global-search-input')?.addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  // Mobile Bottom Place Sheet actions
  document.getElementById('sheet-btn-explore')?.addEventListener('click', () => {
    const willOpen = !mobileDrawer?.classList.contains('mobile-open');
    mobileDrawer?.classList.toggle('mobile-open', willOpen);
    mobileBackdrop?.classList.toggle('active', willOpen);
  });

  document.getElementById('place-sheet-info')?.addEventListener('click', () => {
    const willOpen = !mobileDrawer?.classList.contains('mobile-open');
    mobileDrawer?.classList.toggle('mobile-open', willOpen);
    mobileBackdrop?.classList.toggle('active', willOpen);
  });

  // Google Maps Style Recenter & True North animation
  document.querySelector('.compass-widget')?.addEventListener('click', reorientToNorth);
  document.getElementById('sheet-btn-north')?.addEventListener('click', reorientToNorth);

  // Mobile micro mode switcher
  document.querySelectorAll('.exp-micro-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode;
      if (mode && mode !== currentSection) {
        setExperienceSection(mode);
      }
    });
  });

  // Mobile floor picker tap delegation
  document.getElementById('mobile-floor-picker')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.floor-level-btn');
    if (btn && btn.dataset.scene) {
      loadScene(btn.dataset.scene);
    }
  });

  // Double tap to zoom on touch screens (like Google Street View)
  let lastCanvasTapTime = 0;
  const webglCanvasEl = document.getElementById('webgl-canvas');
  webglCanvasEl?.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') {
      const now = performance.now();
      if (now - lastCanvasTapTime < 320) {
        const fullZoomOut = getSystemZoomOutFov();
        if (Math.abs(targetFov - fullZoomOut) < 8) {
          targetFov = 50;
          showToast('🔍 Zoomed In');
        } else {
          targetFov = fullZoomOut;
          showToast('🔍 Full Zoom Out');
        }
      }
      lastCanvasTapTime = now;
    }
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
    targetFov = Math.min(108, targetFov + 10);
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
      ['modal-search', 'modal-booking', 'modal-help', 'modal-info', 'modal-welcome'].forEach(closeModal);
    }

    // Directional keys for 360 look
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') targetLon -= 12;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') targetLon += 12;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') targetLat += 8;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') targetLat -= 8;
    if (e.key === '+' || e.key === '=') targetFov = Math.max(35, targetFov - 5);
    if (e.key === '-') targetFov = Math.min(108, targetFov + 5);

    // Number keys for section switch
    if (e.key === '1' && !e.target.matches('input, select, textarea')) setExperienceSection('campus');
    if (e.key === '2' && !e.target.matches('input, select, textarea')) setExperienceSection('hostel');
  });
}

// Expose scene navigation helper for testing & external controls

// ============================================================================
// PORTAL & TOUR NAVIGATION CONTROLLERS
// ============================================================================

/**
 * Switch from Starting Homepage to 360° Tour Viewer
 */
function openTourViewer(targetSceneId = null, section = null) {
  const landingPortal = document.getElementById('landing-portal');
  const tourViewer = document.getElementById('tour-viewer');
  if (!tourViewer) return;

  if (landingPortal) {
    landingPortal.classList.add('hidden');
  }
  tourViewer.classList.remove('hidden');

  if (section && section !== currentSection) {
    setExperienceSection(section);
  }
  if (targetSceneId && targetSceneId !== currentSceneId) {
    loadScene(targetSceneId);
  }

  // Trigger resize to ensure WebGL canvas matches viewport
  onWindowResize();

  // Update hash
  if (targetSceneId) {
    window.location.hash = `#tour/${targetSceneId}`;
  } else {
    window.location.hash = '#tour';
  }
}

/**
 * Return to Starting Homepage from 360° Tour
 */
function openLandingPortal(updateHash = true) {
  const landingPortal = document.getElementById('landing-portal');
  const tourViewer = document.getElementById('tour-viewer');
  if (!landingPortal) return;

  tourViewer?.classList.add('hidden');
  landingPortal.classList.remove('hidden');
  landingPortal.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateHash) {
    window.location.hash = '#home';
  }
}

/**
 * Check initial URL hash to determine whether to show tour or starting portal
 */
function handleInitialRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#tour')) {
    const parts = hash.split('/');
    const targetScene = parts[1] || null;
    openTourViewer(targetScene);
  } else {
    openLandingPortal(false);
  }
}

/**
 * Setup event listeners for the starting portal & header navigation
 */
function setupPortalEventListeners() {
  // START NAVIGATION buttons
  document.getElementById('btn-nav-start-tour')?.addEventListener('click', () => openTourViewer());
  document.getElementById('btn-hero-start-nav')?.addEventListener('click', () => openTourViewer());
  document.getElementById('btn-nav-mobile-pill')?.addEventListener('click', () => openTourViewer());
  document.getElementById('btn-nav-mobile-menu-start')?.addEventListener('click', () => {
    document.getElementById('nav-links-menu')?.classList.remove('mobile-open');
    openTourViewer();
  });

  // Return to portal button in 360 tour header
  document.getElementById('btn-return-portal')?.addEventListener('click', () => openLandingPortal());

  // Brand Logo click in tour header returns to starting portal
  document.getElementById('btn-brand-home')?.addEventListener('click', () => openLandingPortal());

  // Mobile navigation drawer toggle
  const mobileToggle = document.getElementById('btn-nav-mobile-toggle');
  const navMenu = document.getElementById('nav-links-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-open');
      });
    });
  }

  // Quick jump & scene launch buttons across the starting portal
  document.querySelectorAll('[data-scene]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetScene = btn.dataset.scene;
      const targetSection = btn.dataset.section || null;
      if (targetScene) {
        openTourViewer(targetScene, targetSection);
      }
    });
  });

  // Footer scene links
  document.querySelectorAll('.footer-scene-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetScene = link.dataset.scene;
      const targetSection = link.dataset.section || null;
      if (targetScene) {
        openTourViewer(targetScene, targetSection);
      }
    });
  });

  // Smooth hashchange handling for browser Back/Forward navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#tour')) {
      const parts = hash.split('/');
      const targetScene = parts[1] || null;
      const tourViewer = document.getElementById('tour-viewer');
      if (tourViewer && tourViewer.classList.contains('hidden')) {
        openTourViewer(targetScene);
      } else if (targetScene && targetScene !== currentSceneId) {
        loadScene(targetScene);
      }
    } else if (hash === '#home' || hash === '' || hash.startsWith('#hero') || hash.startsWith('#about') || hash.startsWith('#department') || hash.startsWith('#campus')) {
      const landingPortal = document.getElementById('landing-portal');
      if (landingPortal && landingPortal.classList.contains('hidden')) {
        openLandingPortal(false);
      }
    }
  });
}

// Expose controllers on window for external access
window.openTourViewer = openTourViewer;
window.openLandingPortal = openLandingPortal;

window.loadScene = loadScene;
window.setCameraLook = (lonDeg, latDeg = 0) => {
  targetLon = lonDeg;
  targetLat = latDeg;
};

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
