import { BrowserWindow, shell, dialog } from 'electron';
import Store from 'electron-store';
import { Octokit } from '@octokit/rest';

interface AuthToken {
  token: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  type?: 'oauth' | 'pat';
}

export class GitHubAuth {
  private store: Store;
  
  constructor(store: Store) {
    this.store = store;
  }

  async authenticate(): Promise<string> {
    // Check if we have a stored token first
    const existingToken = await this.getToken();
    if (existingToken) {
      // Validate the token
      try {
        const octokit = new Octokit({ auth: existingToken });
        await octokit.users.getAuthenticated();
        return existingToken;
      } catch (error) {
        console.log('Stored token is invalid, requesting new token');
        this.store.delete('github_auth');
      }
    }

    // Use Personal Access Token approach
    return await this.personalAccessTokenAuth();
  }

  private async personalAccessTokenAuth(): Promise<string> {
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Enter Token', 'Create Token', 'Cancel'],
      defaultId: 0,
      title: 'GitHub Authentication',
      message: 'GitHub Personal Access Token Required',
      detail: 'To use Bottleneck, you need a GitHub Personal Access Token with the following scopes:\n\n• repo (Full control of private repositories)\n• read:org (Read organization data)\n• read:user (Read user profile data)\n\nClick "Create Token" to open GitHub and create one, or "Enter Token" if you already have one.',
    });

    if (result.response === 2) {
      throw new Error('Authentication cancelled');
    }

    if (result.response === 1) {
      // Open GitHub token creation page
      shell.openExternal('https://github.com/settings/tokens/new?description=Bottleneck%20App&scopes=repo,read:org,read:user,workflow');
    }

    // Show input dialog for token
    const tokenWindow = new BrowserWindow({
      width: 500,
      height: 300,
      modal: true,
      parent: BrowserWindow.getFocusedWindow() || undefined,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      autoHideMenuBar: true,
      resizable: false,
    });

    const tokenPromise = new Promise<string>((resolve, reject) => {
      const { ipcMain } = require('electron');
      
      ipcMain.once('token-submitted', (_event: any, token: string) => {
        if (token && token.trim()) {
          resolve(token.trim());
        } else {
          reject(new Error('No token provided'));
        }
        tokenWindow.close();
      });

      ipcMain.once('token-cancelled', () => {
        reject(new Error('Authentication cancelled'));
        tokenWindow.close();
      });

      tokenWindow.on('closed', () => {
        reject(new Error('Authentication window closed'));
      });
    });

    // Load token input HTML
    tokenWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Enter GitHub Token</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #1e1e1e;
              color: #e1e1e1;
              display: flex;
              flex-direction: column;
              height: 100vh;
              box-sizing: border-box;
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            p {
              margin: 0 0 20px 0;
              font-size: 14px;
              color: #a0a0a0;
              line-height: 1.5;
            }
            input {
              width: 100%;
              padding: 10px;
              font-size: 14px;
              background: #2d2d2d;
              border: 1px solid #3d3d3d;
              color: #e1e1e1;
              border-radius: 4px;
              margin-bottom: 20px;
              box-sizing: border-box;
            }
            input:focus {
              outline: none;
              border-color: #0969da;
            }
            .buttons {
              display: flex;
              gap: 10px;
              justify-content: flex-end;
              margin-top: auto;
            }
            button {
              padding: 8px 16px;
              font-size: 14px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
            }
            .primary {
              background: #0969da;
              color: white;
            }
            .primary:hover {
              background: #0860ca;
            }
            .secondary {
              background: #2d2d2d;
              color: #e1e1e1;
              border: 1px solid #3d3d3d;
            }
            .secondary:hover {
              background: #3d3d3d;
            }
            a {
              color: #0969da;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h2>Enter GitHub Personal Access Token</h2>
          <p>
            Paste your GitHub Personal Access Token below. 
            Need to create one? <a id="create-token" href="https://github.com/settings/tokens/new?description=Bottleneck%20App&scopes=repo,read:org,read:user,workflow" rel="noreferrer noopener">Create token on GitHub</a>
          </p>
          <input 
            type="password" 
            id="token" 
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
            autofocus
            onkeydown="if(event.key === 'Enter') submitToken()"
          />
          <div class="buttons">
            <button class="secondary" onclick="cancel()">Cancel</button>
            <button class="primary" onclick="submitToken()">Authenticate</button>
          </div>
          <script>
            const { ipcRenderer, shell } = require('electron');
            (function(){
              const link = document.getElementById('create-token');
              if (link) {
                link.addEventListener('click', function(e){
                  e.preventDefault();
                  shell.openExternal(link.href);
                });
              }
            })();
            function submitToken() {
              const token = document.getElementById('token').value;
              ipcRenderer.send('token-submitted', token);
            }
            function cancel() {
              ipcRenderer.send('token-cancelled');
            }
          </script>
        </body>
      </html>
    `)}`);

    const token = await tokenPromise;

    // Validate the token
    try {
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.users.getAuthenticated();
      
      // Store the token
      const authToken: AuthToken = {
        token,
        type: 'pat'
      };
      
      this.store.set('github_auth', authToken);
      
      // Show success message
      dialog.showMessageBox({
        type: 'info',
        title: 'Authentication Successful',
        message: `Successfully authenticated as ${user.login}`,
        buttons: ['OK']
      });
      
      return token;
    } catch (error) {
      dialog.showErrorBox(
        'Invalid Token',
        'The provided token is invalid or doesn\'t have the required permissions. Please ensure your token has repo, read:org, and read:user scopes.'
      );
      throw error;
    }
  }

  // Legacy OAuth methods - kept for potential future use
  // private async deviceFlowAuth(): Promise<string> {
  //   const auth = createOAuthDeviceAuth({
  //     clientType: 'oauth-app',
  //     clientId: this.clientId,
  //     scopes: ['repo', 'read:org', 'read:user', 'workflow', 'write:discussion'],
  //     onVerification: (verification) => {
  //       shell.openExternal(verification.verification_uri);
  //       dialog.showMessageBox({
  //         type: 'info',
  //         title: 'GitHub Authentication',
  //         message: `Enter this code on GitHub: ${verification.user_code}`,
  //         detail: `The verification page has been opened in your browser. Enter the code above to authenticate.`,
  //         buttons: ['OK']
  //       });
  //     }
  //   });
  //   const authentication = await auth({ type: 'oauth' });
  //   const authToken: AuthToken = { token: authentication.token };
  //   this.store.set('github_auth', authToken);
  //   return authentication.token;
  // }

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
