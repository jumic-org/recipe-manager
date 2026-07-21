import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'rm-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-container">
      <h2>{{ 'AUTH.CONFIRM.TITLE' | translate }}</h2>
      <p class="description">{{ 'AUTH.CONFIRM.DESCRIPTION' | translate }}</p>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-field">
          <label for="email">{{ 'AUTH.CONFIRM.EMAIL_LABEL' | translate }}</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="form-field">
          <label for="code">{{ 'AUTH.CONFIRM.CODE_LABEL' | translate }}</label>
          <input id="code" type="text" formControlName="code" autocomplete="one-time-code" />
        </div>
        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }
        @if (successMessage) {
          <p class="success">{{ successMessage }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading">
          {{
            loading ? ('AUTH.CONFIRM.SUBMITTING' | translate) : ('AUTH.CONFIRM.SUBMIT' | translate)
          }}
        </button>
      </form>
      <p class="link">
        <a routerLink="/login">{{ 'AUTH.CONFIRM.BACK_TO_SIGN_IN' | translate }}</a>
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
        margin: 0 0 8px;
        text-align: center;
      }
      .description {
        text-align: center;
        color: #666;
        margin: 0 0 24px;
        font-size: 0.9rem;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmComponent implements OnInit {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translateService: TranslateService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.form.patchValue({ email });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const { email, code } = this.form.value;
    this.authService.confirmSignUp(email, code).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = this.translateService.instant('AUTH.CONFIRM.SUCCESS');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Confirmation failed';
      },
    });
  }
}
