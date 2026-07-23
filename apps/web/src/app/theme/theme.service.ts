import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'rm-theme';

  private theme: Theme;

  constructor() {
    const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      this.theme = stored;
    } else {
      this.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.applyTheme();
  }

  get currentTheme(): Theme {
    return this.theme;
  }

  toggle(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(ThemeService.STORAGE_KEY, this.theme);
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
