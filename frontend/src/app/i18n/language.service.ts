import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'language';

/** The interface language. The choice is remembered per browser. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly current = signal<Language>('de');

  /** Applies the remembered language, or the browser's, or German. */
  init(): Promise<unknown> {
    return this.use(this.stored() ?? this.fromBrowser());
  }

  use(language: Language): Promise<unknown> {
    this.current.set(language);
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // storage unavailable: the choice just is not remembered
    }
    return new Promise((resolve) => this.translate.use(language).subscribe({ complete: () => resolve(undefined) }));
  }

  private stored(): Language | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return LANGUAGES.find((language) => language === value) ?? null;
    } catch {
      return null;
    }
  }

  private fromBrowser(): Language {
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'de';
  }
}
