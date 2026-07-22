import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  /** Present only in PR preview deployments. */
  prNumber?: string;
  /** Full GitHub PR URL, present only in PR preview deployments. */
  prUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig | null = null;

  get apiUrl(): string {
    return this.getConfig().apiUrl.replace(/\/+$/, '');
  }

  get userPoolId(): string {
    return this.getConfig().userPoolId;
  }

  get userPoolClientId(): string {
    return this.getConfig().userPoolClientId;
  }

  get region(): string {
    return this.getConfig().region;
  }

  /** The PR number if this is a preview deployment, otherwise undefined. */
  get prNumber(): string | undefined {
    return this.getConfig().prNumber;
  }

  /** The GitHub PR URL if this is a preview deployment, otherwise undefined. */
  get prUrl(): string | undefined {
    return this.getConfig().prUrl;
  }

  /** True when the app is running as a PR preview deployment. */
  get isPrPreview(): boolean {
    const cfg = this.getConfig();
    return typeof cfg.prNumber === 'string' && cfg.prNumber.length > 0;
  }

  get isLoaded(): boolean {
    return this.config !== null;
  }

  async load(): Promise<void> {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    this.validate(json);
    this.config = json;
  }

  private validate(json: unknown): asserts json is AppConfig {
    const requiredKeys: (keyof AppConfig)[] = [
      'apiUrl',
      'userPoolId',
      'userPoolClientId',
      'region',
    ];
    if (typeof json !== 'object' || json === null) {
      throw new Error('config.json must be a JSON object');
    }
    const obj = json as Record<string, unknown>;
    for (const key of requiredKeys) {
      if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
        throw new Error(`config.json: "${key}" must be a non-empty string`);
      }
    }
  }

  private getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('ConfigService has not been loaded. Ensure APP_INITIALIZER is configured.');
    }
    return this.config;
  }
}
