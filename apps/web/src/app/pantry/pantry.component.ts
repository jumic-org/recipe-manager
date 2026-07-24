import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { IngredientOnHand } from '@recipe-manager/shared';
import { PantryService } from './pantry.service';

@Component({
  selector: 'rm-pantry',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="pantry-container">
      <h2>{{ 'PANTRY.TITLE' | translate }}</h2>
      @if (loading) {
        <p class="loading">{{ 'PANTRY.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      <form class="add-form" (ngSubmit)="addIngredient()">
        <input
          type="text"
          [(ngModel)]="newName"
          name="newName"
          [placeholder]="'PANTRY.NAME_PLACEHOLDER' | translate"
          required
        />
        <button type="submit" class="btn-add" [disabled]="!newName.trim() || adding">
          {{ adding ? ('PANTRY.ADDING' | translate) : ('PANTRY.ADD' | translate) }}
        </button>
      </form>
      @if (!loading && ingredients.length === 0 && !error) {
        <p class="empty">{{ 'PANTRY.EMPTY' | translate }}</p>
      }
      <ul class="ingredient-list">
        @for (item of ingredients; track item.id) {
          <li class="ingredient-item">
            <span>{{ item.name }}</span>
            <button class="btn-delete" (click)="deleteIngredient(item.id)">
              {{ 'PANTRY.DELETE' | translate }}
            </button>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .pantry-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 24px;
      }
      h2 {
        margin: 0 0 24px;
      }
      .loading,
      .empty {
        text-align: center;
        color: var(--rm-text-secondary);
        padding: 20px 0;
      }
      .error {
        color: var(--rm-danger);
        text-align: center;
      }
      .add-form {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
      }
      .add-form input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-size: 0.95rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
      }
      .add-form input:focus {
        outline: none;
        border-color: var(--rm-primary);
      }
      .btn-add {
        background: var(--rm-primary);
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-add:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .ingredient-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .ingredient-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--rm-surface);
        border: 1px solid var(--rm-border);
        border-radius: 6px;
        margin-bottom: 8px;
      }
      .btn-delete {
        background: var(--rm-danger-surface);
        color: var(--rm-danger);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantryComponent implements OnInit {
  ingredients: IngredientOnHand[] = [];
  loading = false;
  adding = false;
  error = '';
  newName = '';

  constructor(
    private readonly pantryService: PantryService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadIngredients();
  }

  addIngredient(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.adding = true;
    this.pantryService.addIngredient(name).subscribe({
      next: (item) => {
        this.ingredients.push(item);
        this.newName = '';
        this.adding = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('PANTRY.ADD_ERROR');
        this.adding = false;
        this.cdr.markForCheck();
      },
    });
  }

  deleteIngredient(id: string): void {
    this.pantryService.deleteIngredient(id).subscribe({
      next: () => {
        this.ingredients = this.ingredients.filter((i) => i.id !== id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('PANTRY.DELETE_ERROR');
        this.cdr.markForCheck();
      },
    });
  }

  private loadIngredients(): void {
    this.loading = true;
    this.pantryService.getIngredientsOnHand().subscribe({
      next: (items) => {
        this.ingredients = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('PANTRY.LOAD_ERROR');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
