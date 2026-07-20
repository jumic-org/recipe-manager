import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'rm-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-container">
      <h2>{{ 'AUTH.REGISTER.TITLE' | translate }}</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-field">
          <label for="email">{{ 'AUTH.REGISTER.EMAIL_LABEL' | translate }}</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="form-field">
          <label for="password">{{ 'AUTH.REGISTER.PASSWORD_LABEL' | translate }}</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
          />
        </div>
        <div class="form-field">
          <label for="confirmPassword">{{ 'AUTH.REGISTER.CONFIRM_PASSWORD_LABEL' | translate }}</label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            autocomplete="new-password"
          />
        </div>
        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading">
          {{ loading ? ('AUTH.REGISTER.SUBMITTING' | translate) : ('AUTH.REGISTER.SUBMIT' | translate) }}
        </button>
      </form>
      <p class="link">{{ 'AUTH.REGISTER.HAS_ACCOUNT' | translate }} <a routerLink="/login">{{ 'AUTH.REGISTER.SIGN_IN_LINK' | translate }}</a></p>
    </div>
  `,
  styles: [
    `
      .auth-container {
        max-width: 400px;
        margin: 60px auto;
        padding: 32px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      h2 {
        margin: 0 0 24px;
        text-align: center;
      }
      .form-field {
        margin-bottom: 16px;
      }
      label {
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
        font-size: 0.9rem;
      }
      input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
      }
      input:focus {
        outline: none;
        border-color: #1c5b55;
      }
      button {
        width: 100%;
        padding: 12px;
        background: #1c5b55;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 8px;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: #c0392b;
        font-size: 0.9rem;
        margin: 8px 0;
      }
      .link {
        text-align: center;
        margin-top: 16px;
        font-size: 0.9rem;
      }
      .link a {
        color: #1c5b55;
        font-weight: 600;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly translateService: TranslateService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.errorMessage = this.translateService.instant('AUTH.REGISTER.PASSWORDS_MISMATCH');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.authService.signUp(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/confirm'], { queryParams: { email } });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Registration failed';
      }
    });
  }
}
