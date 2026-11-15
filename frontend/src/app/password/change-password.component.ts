import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PASSWORD_POLICY } from '@recipe-manager/shared';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '../config';

type Result = 'success' | 'wrongCurrent' | 'invalid' | 'error';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <h1>{{ 'password.title' | translate }}</h1>
    <form (ngSubmit)="submit()">
      <label>
        {{ 'password.current' | translate }}
        <input
          type="password"
          name="current"
          autocomplete="current-password"
          required
          [ngModel]="current()"
          (ngModelChange)="current.set($event)"
        />
      </label>
      <label>
        {{ 'password.new' | translate }}
        <input
          type="password"
          name="proposed"
          autocomplete="new-password"
          required
          [ngModel]="proposed()"
          (ngModelChange)="proposed.set($event)"
        />
      </label>
      <label>
        {{ 'password.confirm' | translate }}
        <input
          type="password"
          name="confirmation"
          autocomplete="new-password"
          required
          [ngModel]="confirmation()"
          (ngModelChange)="confirmation.set($event)"
        />
      </label>
      @if (mismatch()) {
        <p role="alert">{{ 'password.mismatch' | translate }}</p>
      }
      <button type="submit" [disabled]="!canSubmit()">{{ 'password.submit' | translate }}</button>
    </form>

    <p>{{ 'password.rules' | translate }}</p>
    <ul class="rules">
      @for (rule of rules(); track rule.key) {
        <li [class.met]="rule.met">
          <span aria-hidden="true">{{ rule.met ? '✓' : '○' }}</span>
          {{ rule.key | translate: { count: rule.count } }}
        </li>
      }
    </ul>

    @if (result(); as result) {
      <p [attr.role]="result === 'success' ? 'status' : 'alert'">
        {{ 'password.' + (result === 'success' ? 'success' : result) | translate }}
      </p>
    }
    <p>
      <a routerLink="/">{{ 'password.back' | translate }}</a>
    </p>
  `,
  styles: `
    .rules {
      list-style: none;
      padding: 0;
    }
    .rules li {
      color: #666;
    }
    .rules li.met {
      color: #1a7f37;
    }
  `,
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly config = inject(ConfigService);

  protected readonly current = signal('');
  protected readonly proposed = signal('');
  protected readonly confirmation = signal('');
  protected readonly busy = signal(false);
  protected readonly result = signal<Result | null>(null);

  protected readonly rules = computed(() => {
    const password = this.proposed();
    return [
      {
        key: 'password.ruleLength',
        count: PASSWORD_POLICY.minLength,
        met: password.length >= PASSWORD_POLICY.minLength,
      },
      { key: 'password.ruleLowercase', count: 0, met: /\p{Ll}/u.test(password) },
      { key: 'password.ruleUppercase', count: 0, met: /\p{Lu}/u.test(password) },
      { key: 'password.ruleDigit', count: 0, met: /\d/.test(password) },
      { key: 'password.ruleSymbol', count: 0, met: /[^\p{L}\p{N}\s]/u.test(password) },
    ];
  });

  protected readonly mismatch = computed(
    () => this.confirmation() !== '' && this.confirmation() !== this.proposed(),
  );

  protected readonly canSubmit = computed(
    () =>
      !this.busy() &&
      this.current() !== '' &&
      this.rules().every((rule) => rule.met) &&
      this.proposed() === this.confirmation(),
  );

  /** Calls the Cognito ChangePassword API with the User's access token. */
  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.result.set(null);
    try {
      const response = await fetch(
        `https://cognito-idp.${this.config.value.cognito.region}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.ChangePassword',
          },
          body: JSON.stringify({
            AccessToken: await this.auth.accessToken(),
            PreviousPassword: this.current(),
            ProposedPassword: this.proposed(),
          }),
        },
      );
      if (response.ok) {
        this.current.set('');
        this.proposed.set('');
        this.confirmation.set('');
        this.result.set('success');
      } else {
        this.result.set(
          this.failure((await response.json().catch(() => ({}))) as { __type?: string }),
        );
      }
    } catch {
      this.result.set('error');
    } finally {
      this.busy.set(false);
    }
  }

  private failure(body: { __type?: string }): Result {
    switch (body.__type) {
      case 'NotAuthorizedException':
        return 'wrongCurrent';
      case 'InvalidPasswordException':
        return 'invalid';
      default:
        return 'error';
    }
  }
}
