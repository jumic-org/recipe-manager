import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';
import { ConfigService } from './config/config.service';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'rm-root',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  isAuthenticated$ = this.authService.isAuthenticated();
  currentLang = 'en';

  /** True when this app instance is a PR preview deployment. */
  readonly isPrPreview: boolean;
  /** PR number string (e.g. "42"), only set for preview deployments. */
  readonly prNumber: string | undefined;
  /** Full GitHub PR URL, only set for preview deployments. */
  readonly prUrl: string | undefined;

  private static readonly LANG_STORAGE_KEY = 'rm-lang';

  constructor(
    private readonly authService: AuthService,
    private readonly translate: TranslateService,
    readonly configService: ConfigService,
    readonly themeService: ThemeService,
  ) {
    this.isPrPreview = configService.isPrPreview;
    this.prNumber = configService.prNumber;
    this.prUrl = configService.prUrl;

    this.translate.addLangs(['en', 'de']);
    const storedLang = localStorage.getItem(AppComponent.LANG_STORAGE_KEY);
    const initialLang = storedLang && ['en', 'de'].includes(storedLang) ? storedLang : 'en';
    this.currentLang = initialLang;
    this.translate.use(initialLang);
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    localStorage.setItem(AppComponent.LANG_STORAGE_KEY, lang);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  signOut(): void {
    this.authService.signOut();
  }
}
