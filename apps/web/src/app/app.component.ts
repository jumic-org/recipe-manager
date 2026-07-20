import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'rm-root',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  isAuthenticated$ = this.authService.isAuthenticated();
  currentLang = 'en';

  constructor(
    private readonly authService: AuthService,
    private readonly translate: TranslateService
  ) {
    this.translate.addLangs(['en', 'de']);
    this.translate.use('en');
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
  }

  signOut(): void {
    this.authService.signOut();
  }
}
