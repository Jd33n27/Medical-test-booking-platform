const CACHE_KEY = "medbook_user_coords";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedCoords {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * Returns cached geolocation if fresh, otherwise requests a new position
 * and caches it. Callers receive coords instantly when a cache hit occurs.
 */
export function getCachedLocation(): Promise<{ latitude: number; longitude: number } | null> {
  // Try cache first
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CachedCoords = JSON.parse(raw);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // Cache is still fresh — kick off a background refresh but return immediately
        refreshLocation();
        return Promise.resolve({ latitude: cached.latitude, longitude: cached.longitude });
      }
    }
  } catch {
    // Corrupted cache — ignore and fetch fresh
  }

  // No valid cache — fetch synchronously (will trigger the browser prompt on first visit)
  return refreshLocation();
}

/**
 * Requests the browser for a fresh position and writes it to localStorage.
 * Returns the coords or null if geolocation is unavailable/denied.
 */
export function refreshLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ...coords, timestamp: Date.now() }),
          );
        } catch {
          // Storage full or unavailable — non-critical
        }
        resolve(coords);
      },
      () => {
        // Denied or error — resolve null so callers aren't left hanging
        resolve(null);
      },
      { timeout: 8000, maximumAge: CACHE_TTL_MS },
    );
  });
}
