import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shapelyeat.app',
  appName: 'FitFuel Planner',
  webDir: 'dist',
  
  // Production server configuration
  // Replace with your actual production URL before building
  server: {
    url: 'https://your-production-url.replit.app',
    cleartext: false
  },
  
  // iOS-specific optimizations
  ios: {
    contentInset: 'automatic',
    // Disable web debugging in production
    webContentsDebuggingEnabled: false,
    allowsLinkPreview: false
  }
};

export default config;
