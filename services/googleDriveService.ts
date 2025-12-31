
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
  private scriptLoadedPromise: Promise<void>;

  constructor() {
    // Priority: Hardcoded Config -> LocalStorage -> Empty
    this.clientId = GOOGLE_CLIENT_ID || (typeof localStorage !== 'undefined' 
      ? localStorage.getItem('nova_drive_client_id') || '' 
      : '');
    
    // Initialize script loader
    this.scriptLoadedPromise = this.loadGoogleScript();

    if (this.clientId) {
      this.initTokenClient();
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return resolve();
      if ((window as any).google?.accounts) return resolve();

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
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
      await this.scriptLoadedPromise;
      
      if (typeof window !== 'undefined' && (window as any).google) {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.error !== undefined) {
              console.error("Token Client Error:", response);
              return;
            }
            this.accessToken = response.access_token;
            // Implicit flow tokens usually last 3600s (1 hour)
            this.saveToken(response.access_token, response.expires_in || 3599);
          },
        });
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

    // Wait for script to load before trying to connect
    await this.scriptLoadedPromise;

    return new Promise((resolve, reject) => {
      // Re-initialize if needed
      if (!this.tokenClient) {
        this.initTokenClient().then(() => {
            if (!this.tokenClient) {
                 reject(new Error("Google Identity Services failed to initialize. Check internet connection."));
            }
        });
      }

      // Small delay to ensure initTokenClient completes if it was just called
      setTimeout(() => {
          if (!this.tokenClient) {
            // Attempt one last immediate init
             try {
                this.initTokenClient();
             } catch(e) { /* ignore */ }
             
             if (!this.tokenClient) {
                reject(new Error("Google Identity Services not loaded. Please refresh."));
                return;
             }
          }

          // Override the callback for this specific request to handle the promise
          this.tokenClient.callback = async (response: any) => {
            if (response.error !== undefined) {
              reject(new Error(`Auth Error: ${response.error}`));
              return;
            }

            try {
              // Verify user email if configured
              await this.verifyUser(response.access_token);
              
              this.accessToken = response.access_token;
              this.saveToken(response.access_token, parseInt(response.expires_in || '3599', 10));
              resolve(this.accessToken!);
            } catch (e) {
              reject(e);
            }
          };

          this.tokenClient.requestAccessToken({ prompt: 'consent' });
      }, 100);
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
