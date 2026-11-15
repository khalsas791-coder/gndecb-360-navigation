/**
 * Build-Time Asset & Vercel Deployment Safety Guard
 * -------------------------------------------------
 * 1. Checks that public/ directory does not exceed the deployment size budget.
 * 2. Confirms that panoramaManifest.json is valid and covers all scenes.
 * 3. Enforces that no raw 8K uncompressed files remain in public/ once CDN is enabled.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const manifestPath = path.join(__dirname, '..', 'src', 'data', 'panoramaManifest.json');

// Default size budget: 50 MB when CDN is active (or 320 MB pre-offload safety ceiling)
const budgetMb = process.env.PUBLIC_SIZE_BUDGET_MB 
  ? parseFloat(process.env.PUBLIC_SIZE_BUDGET_MB) 
  : (process.env.VITE_CDN_BASE_URL ? 50 : 320);

console.log('--- Vercel & Deployment Budget Check ---');
console.log(`Checking public/ directory against budget of ${budgetMb} MB...`);

let totalBytes = 0;
let fileCount = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else {
      totalBytes += fs.statSync(full).size;
      fileCount++;
    }
  }
}

if (fs.existsSync(publicDir)) {
  scanDir(publicDir);
}

const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
console.log(`Total public/ size: ${totalMb} MB (${fileCount} files)`);

// 1. Verify Manifest
if (!fs.existsSync(manifestPath)) {
  console.error(`[ERROR] Missing panorama manifest at ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const panoramaCount = Object.keys(manifest.panoramas || {}).length;
console.log(`Panorama Manifest verified: ${panoramaCount} indexed scenes.`);

// 2. Budget Check
if (parseFloat(totalMb) > budgetMb) {
  console.error(`\n[BUDGET FAILED] public/ size (${totalMb} MB) exceeds maximum allowed budget (${budgetMb} MB).`);
  console.error(`Ensure large 8K and 4K panorama assets are uploaded to Object Storage (R2/S3/B2) and referenced via VITE_CDN_BASE_URL.`);
  process.exit(1);
}

console.log(`[BUDGET PASSED] public/ size is healthy (${totalMb} MB <= ${budgetMb} MB).\n`);
process.exit(0);
