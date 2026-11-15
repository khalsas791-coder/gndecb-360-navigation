/**
 * Responsive Multi-Tier CDN Panorama Loader
 * Resolves optimal resolution and format for device tier:
 *   - Mobile (< 768px or Data-Saver): 2048x1024 (2K)
 *   - Tablet / Standard Desktop: 3840x1920 (4K)
 *   - High-DPI Desktop (1920px+, DPR >= 1.5): 7680x3840 (8K if native)
 *
 * Formats: AVIF -> WebP -> JPEG fallback
 * Non-destructive fallback to local public/ path when CDN is not configured.
 */

import manifestData from '../data/panoramaManifest.json';

// Detect format support once at startup
let supportsWebP = true;
let supportsAVIF = false;

(function checkFormatSupport() {
  const avifImg = new Image();
  avifImg.onload = () => { supportsAVIF = true; };
  avifImg.onerror = () => { supportsAVIF = false; };
  // 1x1 test AVIF data URI
  avifImg.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAOcGl4aQAAAAABAAAAAA==';
})();

/**
 * Determine the optimal resolution tier for the current device and connection
 */
export function getDeviceTier() {
  const isMobile = /Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent) || window.innerWidth < 768;
  const isTablet = (window.innerWidth >= 768 && window.innerWidth < 1280) || /iPad/i.test(navigator.userAgent);
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isConstrained = conn && (conn.saveData || /2g|3g/i.test(conn.effectiveType));

  // Hard rule: Never load 8K on mobile or constrained connections
  if (isMobile || isConstrained) {
    return '2k';
  }

  if (isTablet || window.devicePixelRatio < 1.5 || window.innerWidth < 1920) {
    return '4k';
  }

  return '8k';
}

/**
 * Resolve CDN URL or local fallback for a viewpoint image
 * @param {string} localImagePath - The viewpoint's original image path (e.g. '/1st_year_1st_floor.jpeg')
 * @param {string|null} forcedTier - Optional tier override ('2k', '4k', '8k')
 * @returns {string} - The resolved URL
 */
export function resolvePanoramaUrl(localImagePath, forcedTier = null) {
  if (!localImagePath) return localImagePath;

  const cdnBase = import.meta.env.VITE_CDN_BASE_URL || manifestData.cdnBaseUrl;
  
  // If no CDN is configured, cleanly serve local image from public/
  if (!cdnBase) {
    return localImagePath;
  }

  // Extract panorama ID (filename without extension and leading slash)
  const filename = localImagePath.replace(/^\//, '');
  const baseId = filename.substring(0, filename.lastIndexOf('.')) || filename;
  const meta = manifestData.panoramas[baseId];

  if (!meta) {
    return localImagePath;
  }

  const requestedTier = forcedTier || getDeviceTier();
  
  // Ensure the requested tier is available in the manifest for this panorama
  let activeTier = requestedTier;
  if (!meta.availableTiers.includes(activeTier)) {
    // Graceful degradation: fall back to 4k or 2k
    activeTier = meta.availableTiers.includes('4k') ? '4k' : '2k';
  }

  const format = supportsAVIF ? 'avif' : (supportsWebP ? 'webp' : 'jpeg');
  const cleanBase = cdnBase.replace(/\/+$/, '');
  
  return `${cleanBase}/${meta.cdnPath}/${activeTier}.${format}`;
}

/**
 * Returns low-resolution placeholder URL for progressive two-stage loading
 */
export function getPlaceholderUrl(localImagePath) {
  return resolvePanoramaUrl(localImagePath, '2k');
}
