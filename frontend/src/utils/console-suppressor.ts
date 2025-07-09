/**
 * Console Log Suppressor for Production Environment (Frontend)
 * 
 * This utility suppresses console logs in production to:
 * - Improve performance by avoiding console I/O operations
 * - Prevent sensitive information from being logged in browser console
 * - Clean up production console for better user experience
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  table: console.table,
  dir: console.dir,
  dirxml: console.dirxml,
  group: console.group,
  groupCollapsed: console.groupCollapsed,
  groupEnd: console.groupEnd,
  time: console.time,
  timeEnd: console.timeEnd,
  timeLog: console.timeLog,
  count: console.count,
  countReset: console.countReset,
  clear: console.clear,
  assert: console.assert
};

/**
 * Suppress console methods in production
 * Keeps console.error for critical error logging
 */
export function suppressConsoleInProduction() {
  // Only suppress in production environment
  if (process.env.NODE_ENV === 'production') {
    // Override console methods with no-op functions
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.trace = () => {};
    console.table = () => {};
    console.dir = () => {};
    console.dirxml = () => {};
    console.group = () => {};
    console.groupCollapsed = () => {};
    console.groupEnd = () => {};
    console.time = () => {};
    console.timeEnd = () => {};
    console.timeLog = () => {};
    console.count = () => {};
    console.countReset = () => {};
    console.clear = () => {};
    console.assert = () => {};
    
    // Keep console.error for critical error logging
    // console.error = originalConsole.error;
    
    // Use original console.log to show suppression message once
    originalConsole.log('🔕 Console logs suppressed in production environment');
  }
}

/**
 * Restore original console methods (useful for testing)
 */
export function restoreConsole() {
  Object.keys(originalConsole).forEach(method => {
    (console as any)[method] = (originalConsole as any)[method];
  });
}

/**
 * Get current environment info
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    consolesSuppressed: process.env.NODE_ENV === 'production'
  };
}

/**
 * Initialize console suppression - call this early in app lifecycle
 */
export function initializeConsoleSuppressionForProduction() {
  // Only run on client side
  if (typeof window !== 'undefined') {
    suppressConsoleInProduction();
    
    // Also suppress any potential window.console references
    if (process.env.NODE_ENV === 'production' && window.console) {
      window.console.log = () => {};
      window.console.warn = () => {};
      window.console.info = () => {};
      window.console.debug = () => {};
      window.console.trace = () => {};
      window.console.table = () => {};
      window.console.dir = () => {};
      window.console.dirxml = () => {};
      window.console.group = () => {};
      window.console.groupCollapsed = () => {};
      window.console.groupEnd = () => {};
      window.console.time = () => {};
      window.console.timeEnd = () => {};
      window.console.timeLog = () => {};
      window.console.count = () => {};
      window.console.countReset = () => {};
      window.console.clear = () => {};
      window.console.assert = () => {};
    }
  }
}

export { originalConsole }; 