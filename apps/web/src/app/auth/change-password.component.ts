import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'rm-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-container">
      <h2>{{ 'AUTH.CHANGE_PASSWORD.TITLE' | translate }}</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-field">
          <label for="currentPassword">{{ 'AUTH.CHANGE_PASSWORD.CURRENT_PASSWORD_LABEL' | translate }}</label>
          <input
            id="currentPassword"
            type="password"
            formControlName="currentPassword"
            autocomplete="current-password"
          />
        </div>
        <div class="form-field">
          <label for="newPassword">{{ 'AUTH.CHANGE_PASSWORD.NEW_PASSWORD_LABEL' | translate }}</label>
          <input
            id="newPassword"
            type="password"
            formControlName="newPassword"
            autocomplete="new-password"
          />
        </div>
        <div class="form-field">
          <label for="confirmNewPassword">{{ 'AUTH.CHANGE_PASSWORD.CONFIRM_PASSWORD_LABEL' | translate }}</label>
          <input
            id="confirmNewPassword"
            type="password"
            formControlName="confirmNewPassword"
            autocomplete="new-password"
          />
        </div>
        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }
        @if (successMessage) {
          <p class="success">{{ successMessage }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading">
          {{ loading ? ('AUTH.CHANGE_PASSWORD.SUBMITTING' | translate) : ('AUTH.CHANGE_PASSWORD.SUBMIT' | translate) }}
        </button>
      </form>
      <p class="link"><a routerLink="/recipes">{{ 'AUTH.CHANGE_PASSWORD.BACK_TO_RECIPES' | translate }}</a></p>
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
      .success {
        color: #27ae60;
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
export class ChangePasswordComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly translateService: TranslateService
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { currentPassword, newPassword, confirmNewPassword } = this.form.value;
    if (newPassword !== confirmNewPassword) {
      this.errorMessage = this.translateService.instant('AUTH.CHANGE_PASSWORD.PASSWORDS_MISMATCH');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = this.translateService.instant('AUTH.CHANGE_PASSWORD.SUCCESS');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Password change failed';
      }
    });
  }
}
