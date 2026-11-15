import { Injectable, inject } from '@angular/core';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { ConfigService } from '../config';

/** Sign-in through Cognito Managed Login (authorization code flow with PKCE). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(ConfigService);
  private manager?: UserManager;

  private get userManager(): UserManager {
    if (!this.manager) {
      const { region, userPoolId, clientId, domain } = this.config.value.cognito;
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      this.manager = new UserManager({
        authority: issuer,
        metadata: {
          issuer,
          authorization_endpoint: `${domain}/oauth2/authorize`,
          token_endpoint: `${domain}/oauth2/token`,
          userinfo_endpoint: `${domain}/oauth2/userInfo`,
          jwks_uri: `${issuer}/.well-known/jwks.json`,
        },
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: 'code',
        scope: 'openid email aws.cognito.signin.user.admin',
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        automaticSilentRenew: false,
      });
    }
    return this.manager;
  }

  async user(): Promise<User | null> {
    const user = await this.userManager.getUser();
    if (user && !user.expired) return user;
    if (user?.refresh_token) {
      try {
        return await this.userManager.signinSilent();
      } catch {
        // fall through to sign-in
      }
    }
    return null;
  }

  async accessToken(): Promise<string | null> {
    return (await this.user())?.access_token ?? null;
  }

  async isSignedIn(): Promise<boolean> {
    return (await this.user()) !== null;
  }

  /** Sends the browser to the Managed Login page, remembering where to come back to. */
  signIn(returnTo: string): Promise<void> {
    return this.userManager.signinRedirect({ state: returnTo });
  }

  /** Completes the redirect from Managed Login and returns the path to continue at. */
  async completeSignIn(): Promise<string> {
    const user = await this.userManager.signinRedirectCallback();
    return typeof user.state === 'string' && user.state.startsWith('/') ? user.state : '/';
  }

  async signOut(): Promise<void> {
    const { clientId, domain } = this.config.value.cognito;
    await this.userManager.removeUser();
    const logoutUri = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  }
}
