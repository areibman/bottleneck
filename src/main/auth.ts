import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import Store from 'electron-store';
import * as keytar from 'keytar';

const SERVICE_NAME = 'Bottleneck';
const ACCOUNT_NAME = 'github-token';

export class AuthManager {
  private store: Store;
  private token: string | null = null;

  constructor(store: Store) {
    this.store = store;
  }

  async authenticate(): Promise<string> {
    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: process.env.GITHUB_CLIENT_ID || 'Iv1.8a61f9b3a7aba766', // Replace with your client ID
      scopes: ['repo', 'read:org', 'read:user', 'workflow', 'write:discussion'],
      onVerification: (verification) => {
        // In a real app, you'd show this in the UI
        console.log('Open this URL:', verification.verification_uri);
        console.log('Enter code:', verification.user_code);
      },
    });

    const { token } = await auth({ type: 'oauth' });
    
    // Store token securely
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
    this.token = token;
    this.store.set('authenticated', true);
    
    return token;
  }

  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    try {
      const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (token) {
        this.token = token;
        return token;
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
    }

    return null;
  }

  async logout(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
    
    this.token = null;
    this.store.set('authenticated', false);
  }

  isAuthenticated(): boolean {
    return this.store.get('authenticated', false) as boolean;
  }
}