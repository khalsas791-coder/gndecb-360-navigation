// ============================================================================
// GNDECB CAMPUS 360° - VIEWPOINT & IMAGE REGISTRY
// ============================================================================
// NOTE: Campus panoramas are kept strictly separate from Hostel assets.
// When new campus 360° panoramas are added to public/panoramas/campus/...,
// update the corresponding path and set hasImage: true.

export const CAMPUS_IMAGES = Object.freeze({
  mainGate: '/panoramas/campus/main-gate/main-gate-01.jpeg',
  secondGate: '/panoramas/campus/second-gate/second-gate-01.jpeg',
  mainBlock: '/panoramas/campus/main-block/main-block-01.jpeg',
  canteen: '/panoramas/campus/canteen/canteen-01.jpeg',
  auditorium: '/panoramas/campus/auditorium/auditorium-01.jpeg',
  sportsRoom: '/panoramas/campus/sports-room/sports-room-01.jpeg',
  collegeGround: '/panoramas/campus/college-ground/college-ground-01.jpeg'
});

export const CAMPUS_VIEWPOINTS = {
  campus_main_gate: {
    id: 'campus_main_gate',
    section: 'campus',
    name: 'College Main Gate',
    subtitle: 'Primary Institutional Entrance & Security Portal',
    category: 'Campus Entrances',
    image: CAMPUS_IMAGES.mainGate,
    expectedPath: 'public/panoramas/campus/main-gate/main-gate-01.jpeg',
    hasImage: false,
    floorLabel: 'MAIN GATE',
    breadcrumb: ['Campus', 'Entrances', 'College Main Gate'],
    minimapPos: { top: '90%', left: '20%' },
    connections: {
      forward: 'campus_main_block',
      right: 'campus_second_gate'
    },
    hotspots: [
      {
        lon: 180,
        lat: -10,
        type: 'arrow',
        arrowDir: 'forward',
        title: 'Walk to Main Academic Block',
        subtitle: 'Enter main boulevard towards central administration',
        targetScene: 'campus_main_block'
      },
      {
        lon: 90,
        lat: -10,
        type: 'arrow',
        arrowDir: 'right',
        title: 'Walk to College 2nd Gate',
        subtitle: 'Perimeter road towards second entrance',
        targetScene: 'campus_second_gate'
      },
      {
        lon: 220,
        lat: -6,
        type: 'info',
        title: 'GNDECB Main Portal',
        subtitle: 'Grand Entrance & Flag Gate',
        info: 'Main architectural gateway of Guru Nanak Dev Engineering College with security checkpoint, visitor reception, and institutional insignia.'
      }
    ]
  },
  campus_second_gate: {
    id: 'campus_second_gate',
    section: 'campus',
    name: 'College 2nd Gate',
    subtitle: 'Secondary Access Gate & Sports Complex Approach',
    category: 'Campus Entrances',
    image: '/campus_second_gate.jpeg',
    hasImage: true,
    floorLabel: 'GATE 2',
    breadcrumb: ['Campus', 'Entrances', 'College 2nd Gate'],
    minimapPos: { top: '85%', left: '75%' },
    connections: {
      forward: 'campus_main_gate',
      back: 'campus_ground'
    },
    hotspots: [
      {
        lon: 0,
        lat: -12,
        type: 'arrow',
        arrowDir: 'forward',
        title: 'Walk to College Main Gate',
        subtitle: 'Return along campus boulevard',
        targetScene: 'campus_main_gate'
      },
      {
        lon: 180,
        lat: -12,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Walk to College Ground',
        subtitle: 'Enter athletics stadium and track',
        targetScene: 'campus_ground'
      },
      {
        lon: 150,
        lat: -8,
        type: 'info',
        title: 'East Campus Access',
        subtitle: 'Service & Athletics Entrance',
        info: 'Direct vehicle and student pedestrian gateway providing access to sports grounds and workshop wings.'
      }
    ]
  },
  campus_main_block: {
    id: 'campus_main_block',
    section: 'campus',
    name: 'Main Academic Block',
    subtitle: 'Central Administrative Wing, Dean Office & Lecture Halls',
    category: 'Academic Complex',
    image: CAMPUS_IMAGES.mainBlock,
    expectedPath: 'public/panoramas/campus/main-block/main-block-01.jpeg',
    hasImage: true,
    floorLabel: 'MAIN BLK',
    breadcrumb: ['Campus', 'Academics', 'Main Block'],
    minimapPos: { top: '50%', left: '50%' },
    connections: {
      back: 'campus_main_gate',
      left: 'campus_canteen',
      right: 'campus_auditorium'
    },
    hotspots: [
      {
        lon: 0,
        lat: -14,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Return to Main Gate',
        subtitle: 'Walk down central driveway',
        targetScene: 'campus_main_gate'
      },
      {
        lon: 270,
        lat: -12,
        type: 'arrow',
        arrowDir: 'left',
        title: 'Walk to Central Canteen',
        subtitle: 'Student cafeteria plaza & refreshments',
        targetScene: 'campus_canteen'
      },
      {
        lon: 90,
        lat: -12,
        type: 'arrow',
        arrowDir: 'right',
        title: 'Walk to University Auditorium',
        subtitle: 'Grand ceremonial hall & cultural complex',
        targetScene: 'campus_auditorium'
      },
      {
        lon: 180,
        lat: -6,
        type: 'info',
        title: 'Central Administration Block',
        subtitle: 'Academic Headquarters',
        info: 'Houses Principal Office, Registrar, Dean Academics, centralized seminar halls, and department faculties.'
      }
    ]
  },
  campus_canteen: {
    id: 'campus_canteen',
    section: 'campus',
    name: 'Campus Central Canteen',
    subtitle: 'Student Cafeteria, Shaded Courtyard & Food Hub',
    category: 'Dining & Social',
    image: CAMPUS_IMAGES.canteen,
    expectedPath: 'public/panoramas/campus/canteen/canteen-01.jpeg',
    hasImage: false,
    floorLabel: 'CANTEEN',
    breadcrumb: ['Campus', 'Student Life', 'Central Canteen'],
    minimapPos: { top: '40%', left: '25%' },
    connections: {
      back: 'campus_main_block',
      forward: 'campus_sports_room'
    },
    hotspots: [
      {
        lon: 0,
        lat: -12,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Back to Main Academic Block',
        subtitle: 'Return to central concourse',
        targetScene: 'campus_main_block'
      },
      {
        lon: 180,
        lat: -12,
        type: 'arrow',
        arrowDir: 'forward',
        title: 'Walk to Sports Room & Complex',
        subtitle: 'Proceed towards indoor games arena',
        targetScene: 'campus_sports_room'
      },
      {
        lon: 210,
        lat: -6,
        type: 'info',
        title: 'Student Food Court & Lounge',
        subtitle: 'Multi-Cuisine Dining',
        info: 'Offers wholesome meals, snacks, fresh juices, and shaded outdoor seating area for student collaboration.'
      }
    ]
  },
  campus_auditorium: {
    id: 'campus_auditorium',
    section: 'campus',
    name: 'University Auditorium',
    subtitle: 'Grand Multipurpose Auditorium & Convocation Hall',
    category: 'Cultural & Events',
    image: CAMPUS_IMAGES.auditorium,
    expectedPath: 'public/panoramas/campus/auditorium/auditorium-01.jpeg',
    hasImage: true,
    floorLabel: 'AUDI',
    breadcrumb: ['Campus', 'Events', 'Auditorium'],
    minimapPos: { top: '40%', left: '75%' },
    connections: {
      back: 'campus_main_block',
      forward: 'campus_ground'
    },
    hotspots: [
      {
        lon: 0,
        lat: -12,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Back to Main Academic Block',
        subtitle: 'Return to administrative boulevard',
        targetScene: 'campus_main_block'
      },
      {
        lon: 180,
        lat: -12,
        type: 'arrow',
        arrowDir: 'forward',
        title: 'Walk to College Ground',
        subtitle: 'Continue to outdoor stadium fields',
        targetScene: 'campus_ground'
      },
      {
        lon: 120,
        lat: -6,
        type: 'info',
        title: '1,200-Seat Auditorium Complex',
        subtitle: 'Acoustic Theatre',
        info: 'State-of-the-art auditorium featuring Dolby acoustics, professional stage lighting, and hosting annual cultural fest Genesis and convocations.'
      }
    ]
  },
  campus_sports_room: {
    id: 'campus_sports_room',
    section: 'campus',
    name: 'Campus Sports Room',
    subtitle: 'Indoor Games Arena, Table Tennis, Badminton & Gym',
    category: 'Athletics & Fitness',
    image: CAMPUS_IMAGES.sportsRoom,
    expectedPath: 'public/panoramas/campus/sports-room/sports-room-01.jpeg',
    hasImage: false,
    floorLabel: 'SPORTS',
    breadcrumb: ['Campus', 'Athletics', 'Sports Room'],
    minimapPos: { top: '25%', left: '30%' },
    connections: {
      back: 'campus_canteen',
      right: 'campus_ground'
    },
    hotspots: [
      {
        lon: 0,
        lat: -12,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Back to Central Canteen',
        subtitle: 'Return towards student cafeteria',
        targetScene: 'campus_canteen'
      },
      {
        lon: 90,
        lat: -12,
        type: 'arrow',
        arrowDir: 'right',
        title: 'Walk to College Ground',
        subtitle: 'Step outside to main athletic tracks',
        targetScene: 'campus_ground'
      },
      {
        lon: 240,
        lat: -6,
        type: 'info',
        title: 'Indoor Sports Arena',
        subtitle: 'Recreation & Championship Training',
        info: 'Features wooden badminton courts, international-standard table tennis boards, chess lounge, and gymnasium equipment.'
      }
    ]
  },
  campus_ground: {
    id: 'campus_ground',
    section: 'campus',
    name: 'College Ground & Athletics Arena',
    subtitle: 'Full 400m Running Track, Cricket Ground & Football Stadium',
    category: 'Athletics & Grounds',
    image: CAMPUS_IMAGES.collegeGround,
    expectedPath: 'public/panoramas/campus/college-ground/college-ground-01.jpeg',
    hasImage: false,
    floorLabel: 'GROUND',
    breadcrumb: ['Campus', 'Athletics', 'College Ground'],
    minimapPos: { top: '20%', left: '60%' },
    connections: {
      left: 'campus_sports_room',
      right: 'campus_auditorium',
      back: 'campus_second_gate'
    },
    hotspots: [
      {
        lon: 270,
        lat: -12,
        type: 'arrow',
        arrowDir: 'left',
        title: 'Walk to Indoor Sports Room',
        subtitle: 'Enter gymnasium & sports pavilion',
        targetScene: 'campus_sports_room'
      },
      {
        lon: 90,
        lat: -12,
        type: 'arrow',
        arrowDir: 'right',
        title: 'Walk to University Auditorium',
        subtitle: 'Return to cultural complex',
        targetScene: 'campus_auditorium'
      },
      {
        lon: 0,
        lat: -12,
        type: 'arrow',
        arrowDir: 'back',
        title: 'Walk to College 2nd Gate',
        subtitle: 'Exit towards secondary gate',
        targetScene: 'campus_second_gate'
      },
      {
        lon: 180,
        lat: -6,
        type: 'info',
        title: 'Main Athletics Pavilion',
        subtitle: 'Olympic Standard Track & Grounds',
        info: 'Sprawling green sports ground hosting university athletic meets, cricket matches, football tournaments, and annual sports days.'
      }
    ]
  }
};
