import { BrowserWindow, shell } from 'electron';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import Store from 'electron-store';

interface AuthToken {
  token: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
}

export class GitHubAuth {
  private store: Store;
  private clientId = process.env.GITHUB_CLIENT_ID || 'Iv1.8a61f9b3a7aba766'; // Default for dev
  
  constructor(store: Store) {
    this.store = store;
  }

  async authenticate(): Promise<string> {
    // Try device flow first (better UX)
    try {
      return await this.deviceFlowAuth();
    } catch (error) {
      console.error('Device flow failed, falling back to web flow:', error);
      return await this.webFlowAuth();
    }
  }

  private async deviceFlowAuth(): Promise<string> {
    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: this.clientId,
      scopes: ['repo', 'read:org', 'read:user', 'workflow', 'write:discussion'],
      onVerification: (verification) => {
        // Open the verification URL in the browser
        shell.openExternal(verification.verification_uri);
        
        // Show a dialog or notification with the user code
        const { dialog } = require('electron');
        dialog.showMessageBox({
          type: 'info',
          title: 'GitHub Authentication',
          message: `Enter this code on GitHub: ${verification.user_code}`,
          detail: `The verification page has been opened in your browser. Enter the code above to authenticate.`,
          buttons: ['OK']
        });
      }
    });

    const authentication = await auth({
      type: 'oauth'
    });

    // Store the token
    const authToken: AuthToken = {
      token: authentication.token
    };
    
    this.store.set('github_auth', authToken);
    return authentication.token;
  }

  private async webFlowAuth(): Promise<string> {
    return new Promise((_, reject) => {
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&scope=repo,read:org,read:user,workflow,write:discussion`;
      
      authWindow.loadURL(authUrl);

      authWindow.webContents.on('will-redirect', (event, url) => {
        const parsedUrl = new URL(url);
        
        if (parsedUrl.hostname === 'localhost' || parsedUrl.pathname.includes('/callback')) {
          event.preventDefault();
          
          const code = parsedUrl.searchParams.get('code');
          if (code) {
            // Exchange code for token (would need a backend service for this)
            // For now, we'll use the device flow as primary
            authWindow.close();
            reject(new Error('Web flow requires backend service'));
          } else {
            authWindow.close();
            reject(new Error('No authorization code received'));
          }
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Authentication window closed'));
      });
    });
  }

  async getToken(): Promise<string | null> {
    const auth = this.store.get('github_auth') as AuthToken | undefined;
    
    if (!auth) {
      return null;
    }

    // Check if token is expired
    if (auth.expiresAt && new Date(auth.expiresAt) < new Date()) {
      // Try to refresh if we have a refresh token
      if (auth.refreshToken) {
        try {
          return await this.refreshToken(auth.refreshToken);
        } catch (error) {
          console.error('Failed to refresh token:', error);
          return null;
        }
      }
      return null;
    }

    return auth.token;
  }

  private async refreshToken(_refreshToken: string): Promise<string> {
    // This would need to be implemented with your OAuth app's refresh endpoint
    // For now, return null to trigger re-authentication
    throw new Error('Token refresh not implemented');
  }

  async logout(): Promise<void> {
    this.store.delete('github_auth');
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
