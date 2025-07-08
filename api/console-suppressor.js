/**
 * Console Log Suppressor for Production Environment
 * 
 * This utility suppresses console logs in production to:
 * - Improve performance by avoiding I/O operations
 * - Prevent sensitive information from being logged
 * - Clean up production logs for better monitoring
 */

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
 * Keeps only console.error for critical error logging
 */
function suppressConsoleInProduction() {
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
    
    console.log('🔕 Console logs suppressed in production environment');
  }
}

/**
 * Restore original console methods (useful for testing)
 */
function restoreConsole() {
  Object.keys(originalConsole).forEach(method => {
    console[method] = originalConsole[method];
  });
}

/**
 * Get current environment info
 */
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    consolesSuppressed: process.env.NODE_ENV === 'production'
  };
}

module.exports = {
  suppressConsoleInProduction,
  restoreConsole,
  getEnvironmentInfo,
  originalConsole
}; 