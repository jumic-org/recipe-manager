import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '../config';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <h1>{{ 'password.title' | translate }}</h1>
    <form (ngSubmit)="submit()">
      <label>
        {{ 'password.current' | translate }}
        <input type="password" name="current" autocomplete="current-password" required [(ngModel)]="current" />
      </label>
      <label>
        {{ 'password.new' | translate }}
        <input type="password" name="proposed" autocomplete="new-password" required [(ngModel)]="proposed" />
      </label>
      <button type="submit" [disabled]="busy()">{{ 'password.submit' | translate }}</button>
    </form>
    @switch (result()) {
      @case ('success') {
        <p role="status">{{ 'password.success' | translate }}</p>
      }
      @case ('error') {
        <p role="alert">{{ 'password.error' | translate }}</p>
      }
    }
    <p><a routerLink="/">{{ 'password.back' | translate }}</a></p>
  `,
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly config = inject(ConfigService);

  protected current = '';
  protected proposed = '';
  protected readonly busy = signal(false);
  protected readonly result = signal<'success' | 'error' | null>(null);

  /** Calls the Cognito ChangePassword API with the User's access token. */
  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.result.set(null);
    try {
      const response = await fetch(`https://cognito-idp.${this.config.value.cognito.region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ChangePassword',
        },
        body: JSON.stringify({
          AccessToken: await this.auth.accessToken(),
          PreviousPassword: this.current,
          ProposedPassword: this.proposed,
        }),
      });
      this.result.set(response.ok ? 'success' : 'error');
      if (response.ok) this.current = this.proposed = '';
    } catch {
      this.result.set('error');
    } finally {
      this.busy.set(false);
    }
  }
}
