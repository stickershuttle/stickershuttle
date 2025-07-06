import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing values
 * Prevents excessive API calls by delaying execution until after a period of inactivity
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing callback functions
 * Useful for search inputs, form submissions, etc.
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} - The debounced callback function
 */
export function useDebounceCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Custom hook for throttling function calls
 * Ensures a function is called at most once per specified interval
 * 
 * @param {Function} callback - The function to throttle
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} - The throttled callback function
 */
export function useThrottle(callback, delay = 300) {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);

  const throttledCallback = useCallback(
    (...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        // Execute immediately if enough time has passed
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Custom hook for batching multiple requests
 * Collects multiple requests and processes them together
 * 
 * @param {Function} batchProcessor - Function to process batched requests
 * @param {number} delay - Delay in milliseconds (default: 100ms)
 * @param {number} maxBatchSize - Maximum batch size (default: 10)
 * @returns {Function} - Function to add requests to batch
 */
export function useBatch(batchProcessor, delay = 100, maxBatchSize = 10) {
  const batchRef = useRef([]);
  const timeoutRef = useRef(null);

  const addToBatch = useCallback(
    (request) => {
      return new Promise((resolve, reject) => {
        batchRef.current.push({ request, resolve, reject });

        // Process batch if it's full
        if (batchRef.current.length >= maxBatchSize) {
          processBatch();
          return;
        }

        // Reset timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set timer to process batch
        timeoutRef.current = setTimeout(() => {
          processBatch();
        }, delay);
      });
    },
    [batchProcessor, delay, maxBatchSize]
  );

  const processBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = batchRef.current;
    batchRef.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const requests = batch.map(item => item.request);
      const results = await batchProcessor(requests);

      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }, [batchProcessor]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return addToBatch;
}

/**
 * Custom hook for intelligent request caching
 * Caches API responses and returns cached data when available
 * 
 * @param {string} cacheKey - Unique key for caching
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Object} - Cache utilities { get, set, clear, isExpired }
 */
export function useCache(cacheKey, ttl = 5 * 60 * 1000) {
  const cache = useRef(new Map());

  const get = useCallback((key) => {
    const fullKey = `${cacheKey}:${key}`;
    const entry = cache.current.get(fullKey);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      cache.current.delete(fullKey);
      return null;
    }
    
    return entry.data;
  }, [cacheKey]);

  const set = useCallback((key, data, customTtl = null) => {
    const fullKey = `${cacheKey}:${key}`;
    const expiresAt = Date.now() + (customTtl || ttl);
    
    cache.current.set(fullKey, { data, expiresAt });
  }, [cacheKey, ttl]);

  const clear = useCallback((key = null) => {
    if (key) {
      const fullKey = `${cacheKey}:${key}`;
      cache.current.delete(fullKey);
    } else {
      // Clear all entries for this cache key
      const keysToDelete = [];
      for (const [k] of cache.current.entries()) {
        if (k.startsWith(`${cacheKey}:`)) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach(k => cache.current.delete(k));
    }
  }, [cacheKey]);

  const isExpired = useCallback((key) => {
    const fullKey = `${cacheKey}:${key}`;
    const entry = cache.current.get(fullKey);
    
    if (!entry) return true;
    
    return Date.now() > entry.expiresAt;
  }, [cacheKey]);

  return { get, set, clear, isExpired };
}

/**
 * Custom hook for preventing rapid successive function calls
 * Useful for preventing double-clicks on buttons
 * 
 * @param {Function} callback - The function to call
 * @param {number} delay - Delay in milliseconds (default: 1000ms)
 * @returns {Array} - [execute, isExecuting]
 */
export function usePreventRapidCalls(callback, delay = 1000) {
  const [isExecuting, setIsExecuting] = useState(false);
  const timeoutRef = useRef(null);

  const execute = useCallback(
    async (...args) => {
      if (isExecuting) {
        console.log('⚠️ Preventing rapid successive calls');
        return;
      }

      setIsExecuting(true);

      try {
        await callback(...args);
      } finally {
        // Reset after delay
        timeoutRef.current = setTimeout(() => {
          setIsExecuting(false);
        }, delay);
      }
    },
    [callback, delay, isExecuting]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [execute, isExecuting];
}

/**
 * Custom hook for smart API calls with caching and debouncing
 * Combines multiple optimization strategies
 * 
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - API call utilities and state
 */
export function useSmartApiCall(apiCall, options = {}) {
  const {
    debounceDelay = 300,
    cacheKey = 'api_call',
    cacheTtl = 5 * 60 * 1000,
    enableCache = true,
    enableDebounce = true,
    enableRapidCallPrevention = true,
    rapidCallDelay = 1000
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const cache = useCache(cacheKey, cacheTtl);
  
  const actualApiCall = useCallback(
    async (...args) => {
      const key = JSON.stringify(args);
      
      // Check cache first
      if (enableCache) {
        const cachedData = cache.get(key);
        if (cachedData) {
          console.log('📦 Using cached data for:', key);
          setData(cachedData);
          return cachedData;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await apiCall(...args);
        
        // Cache the result
        if (enableCache && result) {
          cache.set(key, result);
        }
        
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, enableCache, cache]
  );

  // Apply debouncing if enabled
  const debouncedCall = useDebounceCallback(actualApiCall, debounceDelay);
  
  // Apply rapid call prevention if enabled
  const [preventRapidCall, isExecuting] = usePreventRapidCalls(
    enableDebounce ? debouncedCall : actualApiCall,
    rapidCallDelay
  );

  const execute = enableRapidCallPrevention ? preventRapidCall : 
                  (enableDebounce ? debouncedCall : actualApiCall);

  return {
    execute,
    isLoading: isLoading || isExecuting,
    error,
    data,
    clearCache: cache.clear
  };
}

export default {
  useDebounce,
  useDebounceCallback,
  useThrottle,
  useBatch,
  useCache,
  usePreventRapidCalls,
  useSmartApiCall
}; 