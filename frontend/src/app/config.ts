import { Injectable } from '@angular/core';

/** Deployment-specific values, written to `config.json` by the stack. */
export interface AppConfig {
  apiUrl: string;
  cognito: {
    region: string;
    userPoolId: string;
    clientId: string;
    /** Managed Login domain, e.g. `https://name.auth.eu-central-1.amazoncognito.com`. */
    domain: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config?: AppConfig;

  get loaded(): boolean {
    return this.config !== undefined;
  }

  get value(): AppConfig {
    if (!this.config) throw new Error('Configuration not loaded');
    return this.config;
  }

  async load(): Promise<void> {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load config.json (${response.status})`);
    this.config = (await response.json()) as AppConfig;
  }
}
