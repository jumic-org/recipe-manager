import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'rm-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-container">
      <h2>{{ 'AUTH.LOGIN.TITLE' | translate }}</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-field">
          <label for="email">{{ 'AUTH.LOGIN.EMAIL_LABEL' | translate }}</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="form-field">
          <label for="password">{{ 'AUTH.LOGIN.PASSWORD_LABEL' | translate }}</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </div>
        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading">
          {{ loading ? ('AUTH.LOGIN.SUBMITTING' | translate) : ('AUTH.LOGIN.SUBMIT' | translate) }}
        </button>
      </form>
      <p class="link">
        {{ 'AUTH.LOGIN.NO_ACCOUNT' | translate }}
        <a routerLink="/register">{{ 'AUTH.LOGIN.REGISTER_LINK' | translate }}</a>
      </p>
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.form.value;
    this.authService.signIn(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Sign in failed';
      },
    });
  }
}
