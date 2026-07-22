import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecipeService } from './recipe.service';

@Component({
  selector: 'rm-recipe-import',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="import-container">
      <h2>{{ 'RECIPES.IMPORT.TITLE' | translate }}</h2>
      <p class="description">{{ 'RECIPES.IMPORT.DESCRIPTION' | translate }}</p>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-section">
          <div class="form-field">
            <label for="url">{{ 'RECIPES.IMPORT.URL_LABEL' | translate }}</label>
            <input
              id="url"
              type="url"
              formControlName="url"
              [placeholder]="'RECIPES.IMPORT.URL_PLACEHOLDER' | translate"
            />
            @if (form.get('url')?.touched && form.get('url')?.hasError('required')) {
              <p class="field-error">{{ 'RECIPES.IMPORT.URL_REQUIRED' | translate }}</p>
            }
          </div>
        </div>

        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="cancel()">
            {{ 'RECIPES.IMPORT.CANCEL' | translate }}
          </button>
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting">
            {{
              submitting
                ? ('RECIPES.IMPORT.SUBMITTING' | translate)
                : ('RECIPES.IMPORT.SUBMIT' | translate)
            }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .import-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 24px;
      }
      h2 {
        margin: 0 0 8px;
      }
      .description {
        color: #666;
        margin: 0 0 24px;
        font-size: 0.95rem;
      }
      .form-section {
        background: #fff;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid #eee;
      }
      .form-field {
        margin-bottom: 16px;
      }
      .form-field:last-child {
        margin-bottom: 0;
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
        font-size: 0.95rem;
        font-family: inherit;
      }
      input:focus {
        outline: none;
        border-color: #1c5b55;
      }
      .field-error {
        color: #c0392b;
        font-size: 0.85rem;
        margin: 4px 0 0;
      }
      .error {
        color: #c0392b;
        font-size: 0.9rem;
        margin-bottom: 16px;
      }
      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .btn-cancel {
        background: #f0f0f0;
        color: #333;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit {
        background: #1c5b55;
        color: #fff;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeImportComponent {
  form: FormGroup;
  submitting = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly recipeService: RecipeService,
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      url: ['', [Validators.required]],
    });
  }

  cancel(): void {
    this.router.navigate(['/recipes']);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const url = this.form.get('url')?.value;

    this.recipeService.importRecipe(url).subscribe({
      next: (recipe) => {
        this.submitting = false;
        this.router.navigate(['/recipes', recipe.id]);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage =
          err.error?.message ||
          err.message ||
          this.translateService.instant('RECIPES.IMPORT.ERROR');
        this.cdr.markForCheck();
      },
    });
  }
}
