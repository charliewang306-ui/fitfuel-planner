/**
 * Experimental Features Flag System
 * Use VITE_EXPERIMENTAL_UI=1 to enable experimental features
 * Set to 0 to disable for A/B testing or rollback
 */

const EXPERIMENTAL_UI_ENABLED = import.meta.env.VITE_EXPERIMENTAL_UI === '1' || 
                                import.meta.env.VITE_EXPERIMENTAL_UI === 'true' ||
                                import.meta.env.VITE_EXPERIMENTAL_UI === undefined; // Default to enabled

/**
 * Check if experimental UI features are enabled
 */
export function isExperimentalEnabled(): boolean {
  return EXPERIMENTAL_UI_ENABLED;
}

/**
 * Log experimental feature usage (for analytics/debugging)
 */
export function logExperimentalFeature(featureName: string) {
  if (EXPERIMENTAL_UI_ENABLED) {
    console.log(`[Experimental] Using feature: ${featureName}`);
  } else {
    console.warn(`[Experimental] Feature "${featureName}" is disabled (VITE_EXPERIMENTAL_UI=0)`);
  }
}

/**
 * Graceful degradation wrapper for experimental features
 * Returns fallback component/value if experimental features are disabled
 */
export function withExperimental<T>(experimentalValue: T, fallbackValue: T): T {
  return EXPERIMENTAL_UI_ENABLED ? experimentalValue : fallbackValue;
}

// Export experimental status for debugging
if (typeof window !== 'undefined') {
  (window as any).__EXPERIMENTAL_UI__ = EXPERIMENTAL_UI_ENABLED;
  console.log(`[FitFuel] Experimental UI: ${EXPERIMENTAL_UI_ENABLED ? 'ENABLED' : 'DISABLED'}`);
}
