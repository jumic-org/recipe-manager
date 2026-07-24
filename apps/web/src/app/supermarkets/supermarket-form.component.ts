import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SupermarketService } from './supermarket.service';

@Component({
  selector: 'rm-supermarket-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="form-container">
      <h2>{{
        (isEdit ? 'SUPERMARKETS.FORM.TITLE_EDIT' : 'SUPERMARKETS.FORM.TITLE_NEW') | translate
      }}</h2>
      @if (loading) {
        <p class="loading">{{ 'SUPERMARKETS.FORM.LOADING' | translate }}</p>
      }
      <form (ngSubmit)="onSubmit()">
        <div class="form-section">
          <div class="form-field">
            <label for="name">{{ 'SUPERMARKETS.FORM.NAME_LABEL' | translate }}</label>
            <input
              id="name"
              type="text"
              [(ngModel)]="name"
              name="name"
              [placeholder]="'SUPERMARKETS.FORM.NAME_PLACEHOLDER' | translate"
              required
            />
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3>{{ 'SUPERMARKETS.FORM.AISLES_TITLE' | translate }}</h3>
          </div>
          <div class="add-aisle-row">
            <input
              type="text"
              [(ngModel)]="newAisle"
              name="newAisle"
              [placeholder]="'SUPERMARKETS.FORM.AISLE_PLACEHOLDER' | translate"
            />
            <button type="button" class="btn-add" (click)="addAisle()">
              {{ 'SUPERMARKETS.FORM.ADD_AISLE' | translate }}
            </button>
          </div>
          @for (aisle of aisles; track $index; let i = $index) {
            <div class="aisle-row">
              <span class="aisle-number">{{ i + 1 }}.</span>
              @if (editingIndex === i) {
                <input
                  type="text"
                  class="aisle-edit-input"
                  [(ngModel)]="editingValue"
                  [ngModelOptions]="{ standalone: true }"
                  (keyup.enter)="saveAisle(i)"
                />
              } @else {
                <span class="aisle-name">{{ aisle }}</span>
              }
              <div class="aisle-actions">
                @if (editingIndex === i) {
                  <button type="button" class="btn-move" (click)="saveAisle(i)">
                    {{ 'SUPERMARKETS.FORM.UPDATE' | translate }}
                  </button>
                } @else {
                  <button type="button" class="btn-move" (click)="editAisle(i)">
                    {{ 'SUPERMARKETS.FORM.EDIT' | translate }}
                  </button>
                }
                <button
                  type="button"
                  class="btn-move"
                  [disabled]="i === 0"
                  (click)="moveAisle(i, -1)"
                >
                  {{ 'SUPERMARKETS.FORM.UP' | translate }}
                </button>
                <button
                  type="button"
                  class="btn-move"
                  [disabled]="i === aisles.length - 1"
                  (click)="moveAisle(i, 1)"
                >
                  {{ 'SUPERMARKETS.FORM.DOWN' | translate }}
                </button>
                <button type="button" class="btn-remove" (click)="removeAisle(i)">x</button>
              </div>
            </div>
          }
        </div>

        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="cancel()">
            {{ 'SUPERMARKETS.FORM.CANCEL' | translate }}
          </button>
          <button type="submit" class="btn-submit" [disabled]="!name.trim() || submitting">
            {{
              submitting
                ? ('SUPERMARKETS.FORM.SAVING' | translate)
                : isEdit
                  ? ('SUPERMARKETS.FORM.UPDATE' | translate)
                  : ('SUPERMARKETS.FORM.CREATE' | translate)
            }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .form-container {
        max-width: 700px;
        margin: 0 auto;
        padding: 24px;
      }
      h2 {
        margin: 0 0 24px;
      }
      .loading {
        text-align: center;
        color: var(--rm-text-secondary);
      }
      .form-section {
        background: var(--rm-surface);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid var(--rm-border);
      }
      .section-header {
        margin-bottom: 12px;
      }
      .section-header h3 {
        margin: 0;
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
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-size: 0.95rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
      }
      input:focus {
        outline: none;
        border-color: var(--rm-primary);
      }
      .add-aisle-row {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .add-aisle-row input {
        flex: 1;
      }
      .aisle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--rm-bg);
        border-radius: 4px;
        margin-bottom: 6px;
      }
      .aisle-number {
        font-weight: 700;
        min-width: 24px;
      }
      .aisle-name {
        flex: 1;
      }
      .aisle-edit-input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid var(--rm-primary);
        border-radius: 4px;
        font-size: 0.95rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
      }
      .aisle-actions {
        display: flex;
        gap: 4px;
      }
      .btn-add {
        background: var(--rm-primary-surface);
        color: var(--rm-primary);
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-remove {
        background: var(--rm-danger-surface);
        color: var(--rm-danger);
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 700;
      }
      .btn-move {
        background: var(--rm-border);
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        color: var(--rm-text);
      }
      .btn-move:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .error {
        color: var(--rm-danger);
        font-size: 0.9rem;
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
export class SupermarketFormComponent implements OnInit {
  name = '';
  aisles: string[] = [];
  newAisle = '';
  isEdit = false;
  loading = false;
  submitting = false;
  errorMessage = '';
  editingIndex = -1;
  editingValue = '';
  private supermarketId = '';

  constructor(
    private readonly supermarketService: SupermarketService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.supermarketId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.supermarketId;

    if (this.isEdit) {
      this.loading = true;
      this.supermarketService.getSupermarket(this.supermarketId).subscribe({
        next: (sm) => {
          this.name = sm.name;
          this.aisles = [...sm.aisles];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err.message || this.translateService.instant('SUPERMARKETS.FORM.LOAD_ERROR');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  addAisle(): void {
    const aisle = this.newAisle.trim();
    if (!aisle) return;
    this.aisles.push(aisle);
    this.newAisle = '';
  }

  removeAisle(index: number): void {
    this.aisles.splice(index, 1);
  }

  moveAisle(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.aisles.length) return;
    const item = this.aisles.splice(index, 1)[0];
    this.aisles.splice(newIndex, 0, item);
  }

  editAisle(index: number): void {
    this.editingIndex = index;
    this.editingValue = this.aisles[index];
  }

  saveAisle(index: number): void {
    const trimmed = this.editingValue.trim();
    if (trimmed) {
      this.aisles[index] = trimmed;
    }
    this.editingIndex = -1;
    this.editingValue = '';
  }

  cancel(): void {
    this.router.navigate(['/supermarkets']);
  }

  onSubmit(): void {
    const trimmedName = this.name.trim();
    if (!trimmedName) return;
    this.submitting = true;
    this.errorMessage = '';

    const input = { name: trimmedName, aisles: this.aisles };

    const request$ = this.isEdit
      ? this.supermarketService.updateSupermarket(this.supermarketId, input)
      : this.supermarketService.createSupermarket(input);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/supermarkets']);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage =
          err.message || this.translateService.instant('SUPERMARKETS.FORM.SAVE_ERROR');
        this.cdr.markForCheck();
      },
    });
  }
}
