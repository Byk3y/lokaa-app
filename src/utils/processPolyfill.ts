/**
 * Process Polyfill for Browser Environment
 * 
 * This polyfill ensures that process.env is available in the browser
 * for libraries that expect Node.js environment variables.
 * 
 * Must be imported early in the application to work properly.
 */

// Create a global process object if it doesn't exist
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = {
    env: {
      NODE_ENV: import.meta.env.MODE || 'development',
      // Add any other environment variables your app needs
    },
    // Add other process properties that might be expected
    browser: true,
    version: '',
    versions: {},
    platform: 'browser',
    arch: 'x64',
    pid: 0,
    title: 'browser',
    argv: [],
    execArgv: [],
    execPath: '',
    cwd: () => '/',
    chdir: () => {},
    umask: () => 0,
    getuid: () => 0,
    getgid: () => 0,
    getgroups: () => [],
    setuid: () => {},
    setgid: () => {},
    setgroups: () => {},
    initgroups: () => {},
    kill: () => {},
    exit: () => {},
    on: () => {},
    addListener: () => {},
    once: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    listeners: () => [],
    setMaxListeners: () => {},
    getMaxListeners: () => 0,
    emit: () => false,
    listenerCount: () => 0,
    prependListener: () => {},
    prependOnceListener: () => {},
    eventNames: () => [],
  };
}

// Also ensure global is available
if (typeof window !== 'undefined' && !window.global) {
  (window as any).global = window;
}

// Export the process object for modules that import it
export const process = (typeof window !== 'undefined' ? (window as any).process : undefined);

// Log that the polyfill is loaded
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('🔧 [ProcessPolyfill] Process polyfill loaded successfully');
} 