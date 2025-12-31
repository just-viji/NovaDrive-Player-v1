
import { Track } from "../types";
import { GOOGLE_CLIENT_ID, ALLOWED_USER_EMAIL } from "../constants";

// Added userinfo.email scope to verify user identity
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email';
const STORAGE_KEY_TOKEN = 'nova_drive_token';
const STORAGE_KEY_EXPIRY = 'nova_drive_token_expiry';

export class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private clientId: string;
  private isScriptReady: Promise<void>;

  constructor() {
    // Priority: Hardcoded Config -> LocalStorage -> Empty
    this.clientId = GOOGLE_CLIENT_ID || (typeof localStorage !== 'undefined' 
      ? localStorage.getItem('nova_drive_client_id') || '' 
      : '');
    
    // Initialize script waiter
    this.isScriptReady = this.waitForGoogleScript();

    if (this.clientId) {
      // Try to init immediately if possible, but don't block
      this.initTokenClient().catch(console.error);
    }
  }

  /**
   * Waits for the Google Identity Services script (loaded via index.html) to be available on window.
   */
  private waitForGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return resolve();
      
      // Check if already available
      if ((window as any).google?.accounts) {
        return resolve();
      }

      // Poll for the script to load (since it's async in index.html)
      let checks = 0;
      const interval = setInterval(() => {
        if ((window as any).google?.accounts) {
          clearInterval(interval);
          resolve();
        }
        checks++;
        // Check for 10 seconds (100 * 100ms)
        if (checks > 100) {
          clearInterval(interval);
          // We resolve anyway to allow re-trying later, but log the warning
          console.warn("Google Identity Services script timeout. Auth may fail.");
          resolve(); 
        }
      }, 100);
    });
  }

  public setClientId(id: string) {
    this.clientId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nova_drive_client_id', id);
    }
    this.initTokenClient();
  }

  public getClientId(): string {
    return this.clientId;
  }

  // --- Persistence Logic ---

  public getStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiryStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
    
    if (!token || !expiryStr) return null;

    const expiry = parseInt(expiryStr, 10);
    // Add a 5 minute buffer to be safe
    if (Date.now() > expiry - 5 * 60 * 1000) {
      this.clearStoredToken();
      return null;
    }

    this.accessToken = token;
    return token;
  }

  private saveToken(token: string, expiresInSeconds: number) {
    if (typeof localStorage === 'undefined') return;
    const expiryTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiryTime.toString());
  }

  public clearStoredToken() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    this.accessToken = null;
  }

  // -------------------------

  private async initTokenClient() {
    if (!this.clientId) return;

    try {
      await this.isScriptReady;
      
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        // Prevent re-initialization if already exists (optional, but good for stability)
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.error !== undefined) {
              console.error("Token Client Callback Error:", response);
              // We can't reject a promise here easily as this is a callback
              // But the connect() method wraps this in a way to handle it.
              return;
            }
            // Note: This callback is often overridden in connect() for the Promise flow
            // But we keep this default handler just in case
            this.accessToken = response.access_token;
            this.saveToken(response.access_token, response.expires_in || 3599);
          },
        });
      } else {
         console.warn("Google Global Object not found during init");
      }
    } catch (e) {
      console.error("Failed to initialize Google Token Client:", e);
    }
  }

  private async verifyUser(token: string): Promise<void> {
    if (!ALLOWED_USER_EMAIL) return; // No restriction set

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to verify user profile.");
      
      const userData = await response.json();
      
      if (userData.email !== ALLOWED_USER_EMAIL) {
        throw new Error(`ACCESS DENIED: Account ${userData.email} is not authorized. This app is restricted to ${ALLOWED_USER_EMAIL}.`);
      }
    } catch (e) {
      // If we can't verify, we must fail secure
      this.accessToken = null;
      throw e;
    }
  }

  public async connect(): Promise<string> {
    if (!this.clientId) {
      throw new Error("MISSING_CLIENT_ID");
    }

    // Ensure script is ready
    await this.isScriptReady;

    return new Promise(async (resolve, reject) => {
      // 1. Ensure Client is Initialized
      if (!this.tokenClient) {
        await this.initTokenClient();
        if (!this.tokenClient) {
            // Check if internet is actually down or just the script blocked
            if (!navigator.onLine) {
                 reject(new Error("No Internet connection. Cannot connect to Google."));
            } else {
                 reject(new Error("Google Identity Services failed to load. Try refreshing the page."));
            }
            return;
        }
      }

      // 2. Request Token
      try {
        // We override the callback for THIS specific request to capture the result in this Promise
        this.tokenClient.callback = async (response: any) => {
          if (response.error) {
            // Handle specific errors like popup_closed
            if (response.error === 'popup_closed_by_user') {
                reject(new Error("Login cancelled."));
            } else if (response.error === 'access_denied') {
                reject(new Error("Access denied."));
            } else {
                reject(new Error(`Auth Error: ${response.error}`));
            }
            return;
          }

          if (response.access_token) {
            try {
              await this.verifyUser(response.access_token);
              this.accessToken = response.access_token;
              this.saveToken(response.access_token, parseInt(response.expires_in || '3599', 10));
              resolve(this.accessToken!);
            } catch (e) {
              reject(e);
            }
          }
        };

        // Trigger the popup
        this.tokenClient.requestAccessToken({ prompt: 'consent' });

      } catch (e) {
        reject(new Error("Failed to request access token: " + (e as Error).message));
      }
    });
  }

  public async fetchAudioFiles(): Promise<Track[]> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=mimeType contains "audio/" and trashed = false&fields=files(id, name, mimeType, size, webContentLink, thumbnailLink, iconLink)',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
        // If 401, token might have expired despite our checks
        if (response.status === 401) {
          this.clearStoredToken();
          throw new Error("Session expired. Please reconnect.");
        }
        throw new Error(`Drive API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.files) return [];

    return data.files.map((file: any) => ({
      id: file.id,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      artist: "Google Drive",
      album: "Cloud Library",
      duration: 0, 
      url: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      coverArt: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s400') : null, // Try to get higher res
      mimeType: file.mimeType,
      isRemote: true
    }));
  }

  public async getTrackUrl(fileId: string): Promise<string> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch track media");

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

export const driveService = new GoogleDriveService();
