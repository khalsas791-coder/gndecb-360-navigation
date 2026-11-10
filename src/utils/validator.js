// ============================================================================
// RUNTIME INTEGRITY VALIDATOR
// ============================================================================
import { validateRegistryIntegrity } from '../data/navigationRegistry.js';

export function runFullDiagnostic() {
  const result = validateRegistryIntegrity();
  console.group('🔍 [GNDECB 360° Navigation Diagnostic]');
  console.log(`Hostel Viewpoints: ${result.totalHostelViewpoints}`);
  console.log(`Campus Viewpoints: ${result.totalCampusViewpoints}`);
  
  if (result.valid) {
    console.log('%c✅ All viewpoints, routes, and connections are strictly verified and isolated!', 'color: #10b981; font-weight: bold;');
  } else {
    console.error('❌ Diagnostic Errors found:', result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn('⚠️ Diagnostic Warnings:', result.warnings);
  }
  console.groupEnd();
  return result;
}
