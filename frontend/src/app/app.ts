import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';
import { LANGUAGES, LanguageService } from './i18n/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  template: `
    <header>
      <a routerLink="/" class="brand">{{ 'app.title' | translate }}</a>
      <nav>
        <span role="group" [attr.aria-label]="'nav.language' | translate">
          @for (language of languages; track language) {
            <button
              type="button"
              [attr.aria-pressed]="language === languageService.current()"
              (click)="languageService.use(language)"
            >
              {{ language.toUpperCase() }}
            </button>
          }
        </span>
        <a routerLink="/password">{{ 'nav.changePassword' | translate }}</a>
        <button type="button" (click)="auth.signOut()">{{ 'nav.signOut' | translate }}</button>
      </nav>
    </header>
    <main><router-outlet /></main>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly languageService = inject(LanguageService);
  protected readonly languages = LANGUAGES;
}
