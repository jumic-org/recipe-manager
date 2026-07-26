import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { Recipe, Supermarket, IngredientOnHand, Ingredient, Aisle } from '@recipe-manager/shared';
import { RecipeService } from '../recipes/recipe.service';
import { PantryService } from '../pantry/pantry.service';
import { SupermarketService } from './supermarket.service';
import type { AisleGroup } from './supermarket.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'rm-manual-supermarket-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink],
  template: `
    <div class="manual-container">
      @if (loading) {
        <p class="loading">{{ 'SUPERMARKET_VIEW.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (recipe) {
        <div class="header">
          <h2>{{ 'MANUAL_SUPERMARKET_VIEW.TITLE' | translate: { recipeName: recipe.title } }}</h2>
          <a class="btn-link" [routerLink]="['/recipes', recipe.id, 'shop']">
            {{ 'MANUAL_SUPERMARKET_VIEW.BACK_TO_AUTO' | translate }}
          </a>
        </div>

        <div class="supermarket-selector">
          <label for="supermarket">{{ 'SUPERMARKET_VIEW.SELECT_SUPERMARKET' | translate }}</label>
          <select id="supermarket" [(ngModel)]="selectedSupermarketId" (ngModelChange)="onSupermarketChange()">
            <option value="">{{ 'SUPERMARKET_VIEW.NO_SUPERMARKET' | translate }}</option>
            @for (sm of supermarkets; track sm.id) {
              <option [value]="sm.id">{{ sm.name }}</option>
            }
          </select>
        </div>

        @if (selectedSupermarketId) {
          <div class="prompt-section">
            <div class="prompt-field">
              <label for="systemPrompt">{{ 'MANUAL_SUPERMARKET_VIEW.SYSTEM_PROMPT' | translate }}</label>
              <textarea id="systemPrompt" [(ngModel)]="systemPrompt" rows="4"></textarea>
            </div>

            <div class="prompt-field">
              <label for="userPrompt">{{ 'MANUAL_SUPERMARKET_VIEW.USER_PROMPT' | translate }}</label>
              <textarea id="userPrompt" [(ngModel)]="userPrompt" rows="16"></textarea>
            </div>

            <div class="params-row">
              <div class="param-field">
                <label for="temperature">{{ 'MANUAL_SUPERMARKET_VIEW.TEMPERATURE' | translate }}</label>
                <input
                  id="temperature"
                  type="number"
                  [(ngModel)]="temperature"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>

              <div class="param-field">
                <label for="maxTokens">{{ 'MANUAL_SUPERMARKET_VIEW.MAX_TOKENS' | translate }}</label>
                <input
                  id="maxTokens"
                  type="number"
                  [(ngModel)]="maxTokens"
                  min="1"
                  max="8192"
                  step="256"
                />
              </div>
            </div>

            <button class="btn-execute" (click)="execute()" [disabled]="executing">
              {{ executing ? ('MANUAL_SUPERMARKET_VIEW.EXECUTING' | translate) : ('MANUAL_SUPERMARKET_VIEW.EXECUTE' | translate) }}
            </button>
          </div>

          @if (aisleGroups.length > 0 || rawResponse) {
            <div class="results-section">
              @if (aisleGroups.length > 0) {
                <h3>{{ 'MANUAL_SUPERMARKET_VIEW.RESULT' | translate }}</h3>
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
              }

              @if (rawResponse) {
                <h3>{{ 'MANUAL_SUPERMARKET_VIEW.RAW_RESPONSE' | translate }}</h3>
                <pre class="raw-response">{{ rawResponse }}</pre>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [
    `
      .manual-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .header h2 {
        margin: 0;
      }
      .btn-link {
        color: var(--rm-primary);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .btn-link:hover {
        text-decoration: underline;
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
      .prompt-section {
        margin-bottom: 24px;
      }
      .prompt-field {
        margin-bottom: 16px;
      }
      .prompt-field label {
        display: block;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 6px;
      }
      .prompt-field textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.85rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
        resize: vertical;
        box-sizing: border-box;
      }
      .params-row {
        display: flex;
        gap: 24px;
        margin-bottom: 16px;
      }
      .param-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .param-field label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .param-field input {
        padding: 8px 12px;
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        font-size: 0.95rem;
        background: var(--rm-input-bg);
        color: var(--rm-text);
        width: 120px;
      }
      .btn-execute {
        background: var(--rm-primary);
        color: white;
        border: none;
        padding: 10px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
      }
      .btn-execute:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .results-section {
        margin-top: 32px;
        background: var(--rm-surface);
        border: 1px solid var(--rm-border);
        border-radius: 8px;
        padding: 20px;
      }
      .results-section h3 {
        margin: 0 0 16px;
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
      .raw-response {
        background: var(--rm-input-bg);
        border: 1px solid var(--rm-input-border);
        border-radius: 6px;
        padding: 16px;
        font-size: 0.85rem;
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualSupermarketViewComponent implements OnInit {
  recipe: Recipe | null = null;
  supermarkets: Supermarket[] = [];
  ingredientsOnHand: IngredientOnHand[] = [];
  selectedSupermarketId = '';
  systemPrompt = '';
  userPrompt = '';
  temperature = 0.1;
  maxTokens = 4096;
  aisleGroups: AisleGroup[] = [];
  rawResponse = '';
  loading = false;
  executing = false;
  error = '';

  private toPurchase: Ingredient[] = [];
  private selectedAisles: Aisle[] = [];

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

        if (
          this.selectedSupermarketId &&
          !this.supermarkets.some((s) => s.id === this.selectedSupermarketId)
        ) {
          this.selectedSupermarketId = '';
        }

        this.loading = false;
        this.computeToPurchase();
        this.generatePrompts();
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
    this.computeToPurchase();
    this.generatePrompts();
    this.aisleGroups = [];
    this.rawResponse = '';
    this.cdr.markForCheck();
  }

  execute(): void {
    if (!this.selectedSupermarketId || this.toPurchase.length === 0) return;

    this.executing = true;
    this.aisleGroups = [];
    this.rawResponse = '';
    this.cdr.markForCheck();

    this.supermarketService.sortIngredientsManual({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      ingredients: this.toPurchase,
      aisles: this.selectedAisles,
    }).subscribe({
      next: (result) => {
        this.aisleGroups = result.groups;
        this.rawResponse = result.rawResponse;
        this.executing = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = this.translateService.instant('SUPERMARKET_VIEW.LOAD_ERROR');
        this.executing = false;
        this.cdr.markForCheck();
      },
    });
  }

  private computeToPurchase(): void {
    if (!this.recipe) return;

    const onHandNames = this.ingredientsOnHand.map((i) => i.name.toLowerCase());

    this.toPurchase = [];
    for (const ing of this.recipe.ingredients) {
      const ingNameLower = ing.name.toLowerCase();
      const isOnHand = onHandNames.some(
        (name) => ingNameLower.includes(name) || name.includes(ingNameLower),
      );
      if (!isOnHand) {
        this.toPurchase.push(ing);
      }
    }
  }

  private generatePrompts(): void {
    const selectedSupermarket = this.supermarkets.find(
      (s) => s.id === this.selectedSupermarketId,
    );

    if (!selectedSupermarket || this.toPurchase.length === 0) {
      this.systemPrompt = '';
      this.userPrompt = '';
      this.selectedAisles = [];
      return;
    }

    this.selectedAisles = selectedSupermarket.aisles;
    const currentLang = this.translateService.getCurrentLang() || 'en';

    this.supermarketService.getPrompt(this.toPurchase, selectedSupermarket.aisles, currentLang).subscribe({
      next: (result) => {
        this.systemPrompt = result.systemPrompt;
        this.userPrompt = result.userPrompt;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = this.translateService.instant('SUPERMARKET_VIEW.LOAD_ERROR');
        this.cdr.markForCheck();
      },
    });
  }

  private readCookie(): string {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === ManualSupermarketViewComponent.COOKIE_NAME) {
        return value || '';
      }
    }
    return '';
  }

  private saveCookie(value: string): void {
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${ManualSupermarketViewComponent.COOKIE_NAME}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}
