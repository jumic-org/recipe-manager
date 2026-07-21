import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Recipe } from '@recipe-manager/shared';
import { RecipeService } from './recipe.service';

@Component({
  selector: 'rm-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="recipe-detail-container">
      @if (loading) {
        <p class="loading">{{ 'RECIPES.DETAIL.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (recipe) {
        <div class="detail-header">
          <div>
            <h2>{{ recipe.title }}</h2>
            <p class="description">{{ recipe.description }}</p>
          </div>
          <div class="actions">
            <a [routerLink]="['/recipes', recipe.id, 'edit']" class="btn-edit">{{
              'RECIPES.DETAIL.EDIT' | translate
            }}</a>
            <button class="btn-delete" (click)="deleteRecipe()">
              {{ 'RECIPES.DETAIL.DELETE' | translate }}
            </button>
          </div>
        </div>

        <div class="meta-bar">
          @if (recipe.prepTimeMinutes) {
            <div class="meta-item">
              <strong>{{ 'RECIPES.DETAIL.PREP_TIME' | translate }}</strong
              ><span>{{ recipe.prepTimeMinutes }} {{ 'RECIPES.DETAIL.MIN' | translate }}</span>
            </div>
          }
          @if (recipe.cookTimeMinutes) {
            <div class="meta-item">
              <strong>{{ 'RECIPES.DETAIL.COOK_TIME' | translate }}</strong
              ><span>{{ recipe.cookTimeMinutes }} {{ 'RECIPES.DETAIL.MIN' | translate }}</span>
            </div>
          }
          @if (recipe.totalTimeMinutes) {
            <div class="meta-item">
              <strong>{{ 'RECIPES.DETAIL.TOTAL_TIME' | translate }}</strong
              ><span>{{ recipe.totalTimeMinutes }} {{ 'RECIPES.DETAIL.MIN' | translate }}</span>
            </div>
          }
          @if (recipe.servings) {
            <div class="meta-item">
              <strong>{{ 'RECIPES.DETAIL.SERVINGS' | translate }}</strong
              ><span>{{ recipe.servings }}</span>
            </div>
          }
        </div>

        @if (recipe.categories.length > 0 || recipe.tags.length > 0) {
          <div class="tags-section">
            @for (cat of recipe.categories; track cat) {
              <span class="category-tag">{{ cat }}</span>
            }
            @for (tag of recipe.tags; track tag) {
              <span class="recipe-tag">{{ tag }}</span>
            }
          </div>
        }

        <section class="ingredients-section">
          <h3>{{ 'RECIPES.DETAIL.INGREDIENTS' | translate }}</h3>
          @for (group of ingredientGroups; track group.name) {
            @if (group.name) {
              <h4 class="group-name">{{ group.name }}</h4>
            }
            <ul>
              @for (ing of group.items; track $index) {
                <li>{{ ing.amount }} {{ ing.unit }} {{ ing.name }}</li>
              }
            </ul>
          }
        </section>

        <section class="instructions-section">
          <h3>{{ 'RECIPES.DETAIL.INSTRUCTIONS' | translate }}</h3>
          <ol>
            @for (step of recipe.instructions; track step.stepNumber) {
              <li>{{ step.text }}</li>
            }
          </ol>
        </section>

        <a routerLink="/recipes" class="back-link">{{ 'RECIPES.DETAIL.BACK' | translate }}</a>
      }
    </div>
  `,
  styles: [
    `
      .recipe-detail-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
      }
      .loading {
        text-align: center;
        color: #666;
        padding: 40px 0;
      }
      .error {
        color: #c0392b;
        text-align: center;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
      }
      .detail-header h2 {
        margin: 0 0 8px;
      }
      .description {
        color: #666;
        margin: 0;
        line-height: 1.5;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .btn-edit {
        background: #1c5b55;
        color: #fff;
        text-decoration: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .btn-delete {
        background: #c0392b;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .meta-bar {
        display: flex;
        gap: 24px;
        padding: 16px 20px;
        background: #f8f7f2;
        border-radius: 8px;
        margin-bottom: 24px;
      }
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .meta-item strong {
        font-size: 0.8rem;
        color: #888;
        text-transform: uppercase;
      }
      .meta-item span {
        font-size: 1.1rem;
        font-weight: 600;
      }
      .tags-section {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 24px;
      }
      .category-tag {
        background: #e8f5f3;
        color: #1c5b55;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .recipe-tag {
        background: #ece7d9;
        color: #5b4536;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .ingredients-section,
      .instructions-section {
        margin-bottom: 32px;
      }
      h3 {
        margin: 0 0 16px;
        color: #20201d;
      }
      .group-name {
        margin: 16px 0 8px;
        color: #666;
        font-size: 0.95rem;
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
      ol {
        padding-left: 20px;
        margin: 0;
      }
      ol li {
        padding: 8px 0;
        line-height: 1.6;
      }
      .back-link {
        color: #1c5b55;
        font-weight: 600;
        text-decoration: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  loading = false;
  error = '';
  ingredientGroups: { name: string | null; items: Recipe['ingredients'] }[] = [];

  constructor(
    private readonly recipeService: RecipeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = this.translateService.instant('RECIPES.DETAIL.NOT_FOUND');
      return;
    }
    this.loading = true;
    this.recipeService.getRecipe(id).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        this.ingredientGroups = this.groupIngredients(recipe.ingredients);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('RECIPES.DETAIL.LOAD_ERROR');
        this.loading = false;
      },
    });
  }

  deleteRecipe(): void {
    if (!this.recipe) return;
    if (!confirm(this.translateService.instant('RECIPES.DETAIL.CONFIRM_DELETE'))) return;
    this.recipeService.deleteRecipe(this.recipe.id).subscribe({
      next: () => this.router.navigate(['/recipes']),
      error: (err) => {
        this.error = err.message || this.translateService.instant('RECIPES.DETAIL.DELETE_ERROR');
      },
    });
  }

  private groupIngredients(
    ingredients: Recipe['ingredients'],
  ): { name: string | null; items: Recipe['ingredients'] }[] {
    const groups = new Map<string | null, Recipe['ingredients']>();
    for (const ing of ingredients) {
      const key = ing.group;
      const existing = groups.get(key) || [];
      existing.push(ing);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
  }
}
