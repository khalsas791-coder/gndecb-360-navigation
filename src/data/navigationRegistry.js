// ============================================================================
// CENTRALIZED NAVIGATION & VIEWPOINT REGISTRY
// ============================================================================
import { HOSTEL_VIEWPOINTS, HOSTEL_IMAGES } from './hostelRegistry.js';
import { CAMPUS_VIEWPOINTS, CAMPUS_IMAGES } from './campusRegistry.js';

export { HOSTEL_VIEWPOINTS, HOSTEL_IMAGES, CAMPUS_VIEWPOINTS, CAMPUS_IMAGES };

export const ALL_SECTIONS = {
  campus: {
    id: 'campus',
    title: 'GNDECB CAMPUS 360°',
    shortName: 'Campus',
    tagline: 'College Main Gate, Academic Blocks, Canteen, Auditorium & Sports Ground',
    initialSceneId: 'campus_main_gate',
    viewpoints: CAMPUS_VIEWPOINTS
  },
  hostel: {
    id: 'hostel',
    title: 'GNDECB HOSTEL 360°',
    shortName: 'Hostel',
    tagline: 'Old Canteen, Hostel Gates, Reception Lobby, Mess, Gyms, Floors 1-5, Deluxe Suite 525 & Gurudwara',
    initialSceneId: 'campus_2nd_gate',
    viewpoints: HOSTEL_VIEWPOINTS
  }
};

/**
 * Get a specific viewpoint by ID (searches active section or all)
 */
export function getViewpoint(id, section = null) {
  if (section && ALL_SECTIONS[section]) {
    return ALL_SECTIONS[section].viewpoints[id] || null;
  }
  return HOSTEL_VIEWPOINTS[id] || CAMPUS_VIEWPOINTS[id] || null;
}

/**
 * Get all viewpoints for a given section ('campus' or 'hostel')
 */
export function getSectionViewpoints(section) {
  return ALL_SECTIONS[section]?.viewpoints || {};
}

/**
 * Determine which section an ID belongs to ('campus' | 'hostel')
 */
export function getSectionForScene(id) {
  if (CAMPUS_VIEWPOINTS[id]) return 'campus';
  if (HOSTEL_VIEWPOINTS[id]) return 'hostel';
  return 'hostel';
}

/**
 * Get directional connection target from a viewpoint
 * Ensures navigation remains strictly within the same section
 */
export function getConnectedSceneId(sceneId, direction) {
  const current = getViewpoint(sceneId);
  if (!current || !current.connections) return null;

  const targetId = current.connections[direction];
  if (!targetId) return null;

  const target = getViewpoint(targetId);
  if (!target) {
    console.warn(`[NavRegistry] Target viewpoint "${targetId}" not found for direction "${direction}" from "${sceneId}".`);
    return null;
  }

  // Strict section integrity check: Campus routes connect ONLY to Campus; Hostel ONLY to Hostel.
  if (current.section !== target.section) {
    console.error(`[NavRegistry Security] Attempted cross-section link from "${current.id}" (${current.section}) to "${target.id}" (${target.section}). Blocked.`);
    return null;
  }

  return targetId;
}

/**
 * Global multi-field search across Campus & Hostel viewpoints
 */
export function searchViewpoints(query) {
  const clean = (query || '').trim().toLowerCase();
  if (!clean) return [];

  const results = [];

  const searchInRegistry = (sectionKey, registry) => {
    Object.values(registry).forEach(vp => {
      const matchName = vp.name.toLowerCase().includes(clean);
      const matchSubtitle = (vp.subtitle || '').toLowerCase().includes(clean);
      const matchCategory = (vp.category || '').toLowerCase().includes(clean);
      const matchBreadcrumb = (vp.breadcrumb || []).join(' ').toLowerCase().includes(clean);

      if (matchName || matchSubtitle || matchCategory || matchBreadcrumb) {
        results.push({
          ...vp,
          sectionKey,
          sectionTitle: ALL_SECTIONS[sectionKey].shortName
        });
      }
    });
  };

  searchInRegistry('campus', CAMPUS_VIEWPOINTS);
  searchInRegistry('hostel', HOSTEL_VIEWPOINTS);

  return results;
}

/**
 * Perform compile/runtime validation of all viewpoints and links
 */
export function validateRegistryIntegrity() {
  const report = {
    valid: true,
    totalHostelViewpoints: Object.keys(HOSTEL_VIEWPOINTS).length,
    totalCampusViewpoints: Object.keys(CAMPUS_VIEWPOINTS).length,
    errors: [],
    warnings: []
  };

  // Validate Hostel viewpoints
  for (const [id, vp] of Object.entries(HOSTEL_VIEWPOINTS)) {
    if (vp.id !== id) {
      report.errors.push(`Hostel viewpoint key "${id}" does not match id "${vp.id}"`);
      report.valid = false;
    }
    if (vp.section !== 'hostel') {
      report.errors.push(`Hostel viewpoint "${id}" has invalid section "${vp.section}"`);
      report.valid = false;
    }
    if (!vp.image) {
      report.errors.push(`Hostel viewpoint "${id}" missing image path`);
      report.valid = false;
    } else if (vp.image.startsWith('/public/')) {
      report.errors.push(`Hostel viewpoint "${id}" has redundant "/public/" in path: ${vp.image}`);
      report.valid = false;
    }

    // Check connections
    if (vp.connections) {
      for (const [dir, targetId] of Object.entries(vp.connections)) {
        const target = HOSTEL_VIEWPOINTS[targetId];
        if (!target) {
          report.errors.push(`Hostel viewpoint "${id}" connection [${dir}] points to non-existent target "${targetId}"`);
          report.valid = false;
        } else if (target.section !== 'hostel') {
          report.errors.push(`Hostel viewpoint "${id}" connection [${dir}] links across section to "${targetId}"`);
          report.valid = false;
        }
      }
    }

    // Check hotspots
    if (vp.hotspots) {
      vp.hotspots.forEach(hs => {
        if (hs.type === 'arrow' && hs.targetScene) {
          if (!HOSTEL_VIEWPOINTS[hs.targetScene]) {
            report.errors.push(`Hostel viewpoint "${id}" hotspot points to unknown targetScene "${hs.targetScene}"`);
            report.valid = false;
          }
        }
      });
    }
  }

  // Validate Campus viewpoints
  for (const [id, vp] of Object.entries(CAMPUS_VIEWPOINTS)) {
    if (vp.id !== id) {
      report.errors.push(`Campus viewpoint key "${id}" does not match id "${vp.id}"`);
      report.valid = false;
    }
    if (vp.section !== 'campus') {
      report.errors.push(`Campus viewpoint "${id}" has invalid section "${vp.section}"`);
      report.valid = false;
    }

    // Check connections
    if (vp.connections) {
      for (const [dir, targetId] of Object.entries(vp.connections)) {
        const target = CAMPUS_VIEWPOINTS[targetId];
        if (!target) {
          report.errors.push(`Campus viewpoint "${id}" connection [${dir}] points to non-existent target "${targetId}"`);
          report.valid = false;
        } else if (target.section !== 'campus') {
          report.errors.push(`Campus viewpoint "${id}" connection [${dir}] links across section to "${targetId}"`);
          report.valid = false;
        }
      }
    }

    // Check hotspots
    if (vp.hotspots) {
      vp.hotspots.forEach(hs => {
        if (hs.type === 'arrow' && hs.targetScene) {
          if (!CAMPUS_VIEWPOINTS[hs.targetScene]) {
            report.errors.push(`Campus viewpoint "${id}" hotspot points to unknown targetScene "${hs.targetScene}"`);
            report.valid = false;
          }
        }
      });
    }
  }

  return report;
}
