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
    const aisles = selectedSupermarket.aisles;
    const ingredients = this.toPurchase;
    const currentLang = this.translateService.getCurrentLang() || 'en';

    const formatAisle = (aisle: Aisle, index: number): string => {
      if (aisle.comment) {
        return `${index + 1}. ${aisle.name} (${aisle.comment})`;
      }
      return `${index + 1}. ${aisle.name}`;
    };

    if (currentLang === 'de') {
      this.systemPrompt = `Du bist ein JSON-Generator fuer Supermarkt-Einkaufslisten. Du ordnest Zutaten den nummerierten Gaengen zu und gibst die Gruppen STRIKT in aufsteigender Gang-Nummer zurueck. Die Reihenfolge der Gaenge in deiner Ausgabe ist die WICHTIGSTE Anforderung. Antworte NUR mit validem JSON.`;

      this.userPrompt = `AUFGABE: Ordne jede Zutat einem Gang zu. Die Gruppen in deiner Antwort MUESSEN in aufsteigender Reihenfolge der Gang-Nummern sortiert sein.

SCHRITT 1 - Ordne jede Zutat einer Gang-Nummer zu:
Fuer jede Zutat, bestimme welcher nummerierte Gang am besten passt.

SCHRITT 2 - Sortiere die Gruppen nach Gang-Nummer:
Gib die Gruppen in AUFSTEIGENDER Reihenfolge der Gang-Nummern aus (kleinste Nummer zuerst).

NUMMERIERTE GAENGE:
${aisles.map((a, i) => formatAisle(a, i)).join('\n')}

ZUTATEN:
${ingredients.map((ing, i) => `${i + 1}. ${ing.name}${ing.group ? ` (${ing.group})` : ''}`).join('\n')}

BEISPIEL:
Gaenge: 1. Obst und Gemuese  2. Milchprodukte  3. Kaese  4. Mehl  5. Gewuerze
Zutaten: 0=Magerquark, 1=Dinkelmehl, 2=Pizzakraeuter, 3=Mozzarella
Zuordnung: Magerquark->Gang 2, Dinkelmehl->Gang 4, Pizzakraeuter->Gang 5, Mozzarella->Gang 3
Sortiert nach Gang-Nummer (2,3,4,5):
{"groups":[{"aisle":"Milchprodukte","ingredientIndices":[0]},{"aisle":"Kaese","ingredientIndices":[3]},{"aisle":"Mehl","ingredientIndices":[1]},{"aisle":"Gewuerze","ingredientIndices":[2]}]}

AUSGABEFORMAT - JSON-Objekt mit einem Schluessel "groups" (Array). Jedes Element:
- "aisle": exakter Gangname aus der Liste oben (oder "Unknown")
- "ingredientIndices": Array von 0-basierten Indizes der ZUTATEN-Liste

REGELN (nach Prioritaet):
1. REIHENFOLGE: Die Gruppen im Array MUESSEN in aufsteigender Gang-Nummer sortiert sein. Gang 1 vor Gang 2, Gang 2 vor Gang 3, usw. Dies ist die wichtigste Regel.
2. VOLLSTAENDIGKEIT: Jeder Index von 0 bis ${ingredients.length - 1} muss genau einmal vorkommen.
3. ZUORDNUNG: Nutze dein Wissen ueber Supermaerkte und die Kommentare in Klammern als Hilfe.
4. UNBEKANNT: "Unknown" nur als allerletzte Gruppe, falls eine Zutat in keinen Gang passt.
5. LEERE GAENGE: Ueberspringe Gaenge ohne Zutaten, aber behalte die aufsteigende Reihenfolge bei.

Antworte NUR mit dem JSON-Objekt.`;
    } else {
      this.systemPrompt = `You are a JSON generator for supermarket shopping lists. You assign ingredients to numbered aisles and return groups STRICTLY in ascending aisle number order. The ordering of aisles in your output is the MOST IMPORTANT requirement. Respond ONLY with valid JSON.`;

      this.userPrompt = `TASK: Assign each ingredient to an aisle. The groups in your response MUST be sorted in ascending aisle number order.

STEP 1 - Assign each ingredient to an aisle number:
For each ingredient, determine which numbered aisle is the best fit.

STEP 2 - Sort groups by aisle number:
Output the groups in ASCENDING order of aisle numbers (lowest number first).

NUMBERED AISLES:
${aisles.map((a, i) => formatAisle(a, i)).join('\n')}

INGREDIENTS:
${ingredients.map((ing, i) => `${i + 1}. ${ing.name}${ing.group ? ` (${ing.group})` : ''}`).join('\n')}

EXAMPLE:
Aisles: 1. Fruits and vegetables  2. Dairy  3. Cheese  4. Flour  5. Spices
Ingredients: 0=low-fat quark, 1=spelt flour, 2=pizza herbs, 3=mozzarella
Assignment: low-fat quark->aisle 2, spelt flour->aisle 4, pizza herbs->aisle 5, mozzarella->aisle 3
Sorted by aisle number (2,3,4,5):
{"groups":[{"aisle":"Dairy","ingredientIndices":[0]},{"aisle":"Cheese","ingredientIndices":[3]},{"aisle":"Flour","ingredientIndices":[1]},{"aisle":"Spices","ingredientIndices":[2]}]}

OUTPUT FORMAT - JSON object with a single key "groups" (array). Each element:
- "aisle": exact aisle name from the list above (or "Unknown")
- "ingredientIndices": array of 0-based indices referencing the INGREDIENTS list

RULES (by priority):
1. ORDER: The groups array MUST be sorted in ascending aisle number order. Aisle 1 before aisle 2, aisle 2 before aisle 3, etc. This is the most important rule.
2. COMPLETENESS: Every index from 0 to ${ingredients.length - 1} must appear exactly once.
3. ASSIGNMENT: Use your grocery knowledge and the comments in parentheses as hints.
4. UNKNOWN: "Unknown" only as the very last group, if an ingredient fits no aisle.
5. EMPTY AISLES: Skip aisles with no ingredients, but maintain ascending order.

Respond ONLY with the JSON object.`;
    }
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
