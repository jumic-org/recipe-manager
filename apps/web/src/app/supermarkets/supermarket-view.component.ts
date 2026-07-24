import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { Recipe, Supermarket, IngredientOnHand, Ingredient } from '@recipe-manager/shared';
import { RecipeService } from '../recipes/recipe.service';
import { PantryService } from '../pantry/pantry.service';
import { SupermarketService } from './supermarket.service';
import { forkJoin } from 'rxjs';

export interface AisleGroup {
  aisle: string;
  ingredients: Ingredient[];
}

@Component({
  selector: 'rm-supermarket-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="shop-container">
      @if (loading) {
        <p class="loading">{{ 'SUPERMARKET_VIEW.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (recipe) {
        <h2>{{ 'SUPERMARKET_VIEW.TITLE' | translate: { recipeName: recipe.title } }}</h2>

        <div class="supermarket-selector">
          <label for="supermarket">{{ 'SUPERMARKET_VIEW.SELECT_SUPERMARKET' | translate }}</label>
          <select id="supermarket" [(ngModel)]="selectedSupermarketId" (ngModelChange)="onSupermarketChange()">
            <option value="">{{ 'SUPERMARKET_VIEW.NO_SUPERMARKET' | translate }}</option>
            @for (sm of supermarkets; track sm.id) {
              <option [value]="sm.id">{{ sm.name }}</option>
            }
          </select>
        </div>

        <div class="lists">
          <section class="purchase-section">
            <div class="section-header">
              <h3>{{ 'SUPERMARKET_VIEW.TO_PURCHASE' | translate }}</h3>
              <button class="btn-copy" (click)="copyToClipboard()">
                {{ copied ? ('SUPERMARKET_VIEW.COPIED' | translate) : ('SUPERMARKET_VIEW.COPY' | translate) }}
              </button>
            </div>
            @if (aisleGroups.length === 0) {
              <p class="empty">{{ 'SUPERMARKET_VIEW.NOTHING_TO_BUY' | translate }}</p>
            }
            @for (group of aisleGroups; track group.aisle) {
              <div class="aisle-group">
                <h4 class="aisle-name">{{ group.aisle }}</h4>
                <ul>
                  @for (ing of group.ingredients; track $index) {
                    <li>{{ ing.amount }} {{ ing.unit }} {{ ing.name }}</li>
                  }
                </ul>
              </div>
            }
          </section>

          <section class="on-hand-section">
            <h3>{{ 'SUPERMARKET_VIEW.ON_HAND' | translate }}</h3>
            @if (onHandIngredients.length === 0) {
              <p class="empty">{{ 'SUPERMARKET_VIEW.NOTHING_ON_HAND' | translate }}</p>
            }
            <ul>
              @for (ing of onHandIngredients; track $index) {
                <li>{{ ing.amount }} {{ ing.unit }} {{ ing.name }}</li>
              }
            </ul>
          </section>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .shop-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
      }
      h2 {
        margin: 0 0 24px;
      }
      .loading {
        text-align: center;
        color: var(--rm-text-secondary);
        padding: 40px 0;
      }
      .error {
        color: var(--rm-danger);
        text-align: center;
      }
      .supermarket-selector {
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .supermarket-selector label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .supermarket-selector select {
        padding: 8px 12px;
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-size: 0.95rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
      }
      .lists {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .purchase-section,
      .on-hand-section {
        background: var(--rm-surface);
        border: 1px solid var(--rm-border);
        border-radius: 8px;
        padding: 20px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .section-header h3 {
        margin: 0;
      }
      .on-hand-section h3 {
        margin: 0 0 16px;
      }
      .btn-copy {
        background: var(--rm-primary-surface);
        color: var(--rm-primary);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
      }
      .empty {
        color: var(--rm-text-secondary);
        font-size: 0.9rem;
      }
      .aisle-group {
        margin-bottom: 16px;
      }
      .aisle-name {
        margin: 0 0 8px;
        color: var(--rm-text-secondary);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      ul {
        list-style: disc;
        padding-left: 20px;
        margin: 0;
      }
      ul li {
        padding: 4px 0;
        line-height: 1.5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupermarketViewComponent implements OnInit {
  recipe: Recipe | null = null;
  supermarkets: Supermarket[] = [];
  ingredientsOnHand: IngredientOnHand[] = [];
  selectedSupermarketId = '';
  aisleGroups: AisleGroup[] = [];
  onHandIngredients: Ingredient[] = [];
  loading = false;
  error = '';
  copied = false;

  private static readonly COOKIE_NAME = 'rm-default-supermarket';

  constructor(
    private readonly recipeService: RecipeService,
    private readonly pantryService: PantryService,
    private readonly supermarketService: SupermarketService,
    private readonly route: ActivatedRoute,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = this.translateService.instant('SUPERMARKET_VIEW.RECIPE_NOT_FOUND');
      return;
    }

    this.loading = true;
    this.selectedSupermarketId = this.readCookie();

    forkJoin({
      recipe: this.recipeService.getRecipe(id),
      ingredients: this.pantryService.getIngredientsOnHand(),
      supermarkets: this.supermarketService.getSupermarkets(),
    }).subscribe({
      next: (result) => {
        this.recipe = result.recipe;
        this.ingredientsOnHand = result.ingredients;
        this.supermarkets = result.supermarkets;

        // Validate cookie value still exists
        if (
          this.selectedSupermarketId &&
          !this.supermarkets.some((s) => s.id === this.selectedSupermarketId)
        ) {
          this.selectedSupermarketId = '';
        }

        this.computeLists();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('SUPERMARKET_VIEW.LOAD_ERROR');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSupermarketChange(): void {
    this.saveCookie(this.selectedSupermarketId);
    this.computeLists();
  }

  copyToClipboard(): void {
    const lines: string[] = [];
    for (const group of this.aisleGroups) {
      lines.push(`[${group.aisle}]`);
      for (const ing of group.ingredients) {
        const parts = [ing.amount ? String(ing.amount) : '', ing.unit, ing.name]
          .filter((p) => p)
          .join(' ');
        lines.push(`- ${parts}`);
      }
      lines.push('');
    }
    const text = lines.join('\n').trim();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copied = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.copied = false;
          this.cdr.markForCheck();
        }, 2000);
      })
      .catch(() => {
        // Clipboard API may fail on non-HTTPS or when permission is denied
        console.warn('Failed to copy to clipboard');
      });
  }

  private computeLists(): void {
    if (!this.recipe) return;

    const onHandNames = this.ingredientsOnHand.map((i) => i.name.toLowerCase());

    const toPurchase: Ingredient[] = [];
    const onHand: Ingredient[] = [];

    for (const ing of this.recipe.ingredients) {
      const ingNameLower = ing.name.toLowerCase();
      const isOnHand = onHandNames.some(
        (name) => ingNameLower.includes(name) || name.includes(ingNameLower),
      );
      if (isOnHand) {
        onHand.push(ing);
      } else {
        toPurchase.push(ing);
      }
    }

    this.onHandIngredients = onHand;
    this.aisleGroups = this.groupByAisle(toPurchase);
  }

  private groupByAisle(ingredients: Ingredient[]): AisleGroup[] {
    const selectedSupermarket = this.supermarkets.find(
      (s) => s.id === this.selectedSupermarketId,
    );
    const aisles = selectedSupermarket ? selectedSupermarket.aisles : [];
    const otherLabel = this.translateService.instant('SUPERMARKET_VIEW.OTHER_AISLE');

    const groups = new Map<string, Ingredient[]>();

    // Initialize groups in aisle order
    for (const aisle of aisles) {
      groups.set(aisle, []);
    }
    groups.set(otherLabel, []);

    for (const ing of ingredients) {
      const ingNameLower = ing.name.toLowerCase();
      let matched = false;
      for (const aisle of aisles) {
        if (ingNameLower.includes(aisle.toLowerCase()) || aisle.toLowerCase().includes(ingNameLower)) {
          const list = groups.get(aisle)!;
          list.push(ing);
          matched = true;
          break;
        }
      }
      if (!matched) {
        groups.get(otherLabel)!.push(ing);
      }
    }

    // Build result preserving aisle order, filtering empty groups
    const result: AisleGroup[] = [];
    for (const aisle of aisles) {
      const items = groups.get(aisle)!;
      if (items.length > 0) {
        result.push({ aisle, ingredients: items });
      }
    }
    const otherItems = groups.get(otherLabel)!;
    if (otherItems.length > 0) {
      result.push({ aisle: otherLabel, ingredients: otherItems });
    }

    return result;
  }

  private readCookie(): string {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === SupermarketViewComponent.COOKIE_NAME) {
        return value || '';
      }
    }
    return '';
  }

  private saveCookie(value: string): void {
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    document.cookie = `${SupermarketViewComponent.COOKIE_NAME}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}
