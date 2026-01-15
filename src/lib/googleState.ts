// Global singleton to share Google connection state across all hooks
// This solves the issue of localStorage not being shared between iframe contexts

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  userInfo?: {
    email: string;
    name: string;
    picture: string;
  };
}

const STORAGE_KEY = "google_tokens";

class GoogleStateManager {
  private tokens: GoogleTokens | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
    
    // Listen for storage changes from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.loadFromStorage();
          this.notifyListeners();
        }
      });
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored);
        this.initialized = true;
        console.log("[GoogleState] Loaded tokens from storage, scope:", this.tokens?.scope);
      }
    } catch (e) {
      console.error("[GoogleState] Error loading from storage:", e);
    }
  }

  getTokens(): GoogleTokens | null {
    // Always try to get fresh from localStorage
    if (!this.tokens) {
      this.loadFromStorage();
    }
    return this.tokens;
  }

  setTokens(tokens: GoogleTokens | null) {
    this.tokens = tokens;
    this.initialized = true;
    
    if (tokens) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    this.notifyListeners();
  }

  isConnected(): boolean {
    const tokens = this.getTokens();
    // Consider connected if we can refresh (refreshToken), even if the accessToken is expired.
    return !!(tokens?.refreshToken || (tokens?.accessToken && tokens.expiresAt > Date.now()));
  }

  hasCalendarAccess(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;
    // If scope is missing (older stored tokens), allow trying; API will return 403 if not permitted.
    if (!tokens.scope) return true;
    return tokens.scope.includes("calendar");
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// Export a singleton instance
export const googleState = new GoogleStateManager();
