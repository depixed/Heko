import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@heko_session_id';

class SessionManager {
  private sessionId: string | null = null;

  /**
   * Gets or creates a session ID
   * Session persists until app is closed or explicitly cleared
   */
  async getSessionId(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    try {
      // Try to get existing session ID
      const stored = await AsyncStorage.getItem(SESSION_KEY);
      
      if (stored) {
        this.sessionId = stored;
        return this.sessionId;
      }

      // Generate new session ID
      const newSessionId = this.generateSessionId();
      await AsyncStorage.setItem(SESSION_KEY, newSessionId);
      this.sessionId = newSessionId;
      
      console.log('[SessionManager] Created new session:', newSessionId);
      return this.sessionId;
    } catch (error) {
      console.error('[SessionManager] Error getting session ID:', error);
      // Fallback to in-memory session ID
      const fallbackId = this.generateSessionId();
      this.sessionId = fallbackId;
      return fallbackId;
    }
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    // Generate UUID-like session ID
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${randomPart}`;
  }

  /**
   * Clears the current session (useful for logout or testing)
   */
  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      this.sessionId = null;
      console.log('[SessionManager] Session cleared');
    } catch (error) {
      console.error('[SessionManager] Error clearing session:', error);
    }
  }

  /**
   * Gets current session ID without creating a new one
   */
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
}

export const sessionManager = new SessionManager();

