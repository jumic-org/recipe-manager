import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecipeService } from './recipe.service';

type ImportMode = 'url' | 'text';

@Component({
  selector: 'rm-recipe-import',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="import-container">
      <h2>{{ 'RECIPES.IMPORT.TITLE' | translate }}</h2>

      <div class="tab-toggle">
        <button
          type="button"
          class="tab-btn"
          [class.active]="mode === 'url'"
          (click)="switchMode('url')"
        >
          {{ 'RECIPES.IMPORT.TAB_URL' | translate }}
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="mode === 'text'"
          (click)="switchMode('text')"
        >
          {{ 'RECIPES.IMPORT.TAB_TEXT' | translate }}
        </button>
      </div>

      @if (mode === 'url') {
        <p class="description">{{ 'RECIPES.IMPORT.DESCRIPTION' | translate }}</p>
      } @else {
        <p class="description">{{ 'RECIPES.IMPORT.TEXT_DESCRIPTION' | translate }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-section">
          @if (mode === 'url') {
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
              @if (form.get('url')?.touched && form.get('url')?.hasError('pattern')) {
                <p class="field-error">{{ 'RECIPES.IMPORT.INVALID_URL' | translate }}</p>
              }
            </div>
          } @else {
            <div class="form-field">
              <label for="text">{{ 'RECIPES.IMPORT.TEXT_LABEL' | translate }}</label>
              <textarea
                id="text"
                formControlName="text"
                [placeholder]="'RECIPES.IMPORT.TEXT_PLACEHOLDER' | translate"
                rows="10"
              ></textarea>
              @if (form.get('text')?.touched && form.get('text')?.hasError('required')) {
                <p class="field-error">{{ 'RECIPES.IMPORT.TEXT_REQUIRED' | translate }}</p>
              }
            </div>
          }
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
      .tab-toggle {
        display: flex;
        gap: 0;
        margin-bottom: 16px;
        border: 1px solid var(--rm-border);
        border-radius: 6px;
        overflow: hidden;
      }
      .tab-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        background: var(--rm-surface);
        color: var(--rm-text-secondary);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition:
          background 0.2s,
          color 0.2s;
      }
      .tab-btn.active {
        background: var(--rm-primary);
        color: #fff;
      }
      .description {
        color: var(--rm-text-secondary);
        margin: 0 0 24px;
        font-size: 0.95rem;
      }
      .form-section {
        background: var(--rm-surface);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid var(--rm-border);
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
      input,
      textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-size: 0.95rem;
        font-family: inherit;
        background: var(--rm-input-bg);
        color: var(--rm-text);
      }
      input:focus,
      textarea:focus {
        outline: none;
        border-color: var(--rm-primary);
      }
      textarea {
        resize: vertical;
        min-height: 150px;
      }
      .field-error {
        color: var(--rm-danger);
        font-size: 0.85rem;
        margin: 4px 0 0;
      }
      .error {
        color: var(--rm-danger);
        font-size: 0.9rem;
        margin-bottom: 16px;
      }
      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .btn-cancel {
        background: var(--rm-border);
        color: var(--rm-text);
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit {
        background: var(--rm-primary);
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
export class RecipeImportComponent implements OnInit {
  mode: ImportMode = 'url';
  form: FormGroup;
  submitting = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly recipeService: RecipeService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      url: [''],
      text: [''],
    });
    this.switchMode('url');
  }

  ngOnInit(): void {
    const modeParam = this.route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'text' || modeParam === 'url') {
      this.switchMode(modeParam);
    }
  }

  switchMode(mode: ImportMode): void {
    this.mode = mode;
    this.errorMessage = '';

    if (mode === 'url') {
      this.form.get('url')?.setValidators([Validators.required, Validators.pattern(/^https:\/\/.+/)]);
      this.form.get('text')?.clearValidators();
    } else {
      this.form.get('url')?.clearValidators();
      this.form.get('text')?.setValidators([Validators.required]);
    }

    this.form.get('url')?.updateValueAndValidity();
    this.form.get('text')?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  cancel(): void {
    this.router.navigate(['/recipes']);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const request$ =
      this.mode === 'url'
        ? this.recipeService.importRecipe(this.form.get('url')?.value)
        : this.recipeService.importRecipeFromText(this.form.get('text')?.value);

    request$.subscribe({
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
