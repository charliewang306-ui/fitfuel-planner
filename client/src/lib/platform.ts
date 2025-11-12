import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for handling iOS App Store requirements
 */

/**
 * Check if running in iOS Capacitor environment
 * Returns true if app is running as native iOS app
 */
export function isIOSApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running in any native Capacitor environment (iOS or Android)
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running in web browser (not native app)
 */
export function isWebApp(): boolean {
  return !Capacitor.isNativePlatform();
}

/**
 * Get current platform name
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
