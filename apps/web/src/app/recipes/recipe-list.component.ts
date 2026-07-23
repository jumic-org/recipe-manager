import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Recipe } from '@recipe-manager/shared';
import { RecipeService } from './recipe.service';

@Component({
  selector: 'rm-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="recipe-list-container">
      <div class="list-header">
        <h2>{{ 'RECIPES.LIST.TITLE' | translate }}</h2>
        <div class="header-actions">
          <a routerLink="/recipes/import" class="btn-import">{{ 'RECIPES.LIST.IMPORT_RECIPE' | translate }}</a>
          <a routerLink="/recipes/import" [queryParams]="{mode: 'text'}" class="btn-import">{{ 'RECIPES.LIST.IMPORT_TEXT_RECIPE' | translate }}</a>
          <a routerLink="/recipes/new" class="btn-new">{{ 'RECIPES.LIST.NEW_RECIPE' | translate }}</a>
        </div>
      </div>
      @if (loading) {
        <p class="loading">{{ 'RECIPES.LIST.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (!loading && recipes.length === 0 && !error) {
        <p class="empty">{{ 'RECIPES.LIST.EMPTY' | translate }}</p>
      }
      <div class="recipe-grid">
        @for (recipe of recipes; track recipe.id) {
          <article class="recipe-card">
            <a [routerLink]="['/recipes', recipe.id]" class="card-link">
              <h3>{{ recipe.title }}</h3>
              <p class="description">{{ recipe.description }}</p>
              <div class="meta">
                @if (recipe.prepTimeMinutes) {
                  <span
                    >{{ 'RECIPES.LIST.PREP' | translate }}: {{ recipe.prepTimeMinutes }}min</span
                  >
                }
                @if (recipe.cookTimeMinutes) {
                  <span
                    >{{ 'RECIPES.LIST.COOK' | translate }}: {{ recipe.cookTimeMinutes }}min</span
                  >
                }
                @if (recipe.servings) {
                  <span>{{ 'RECIPES.LIST.SERVES' | translate }}: {{ recipe.servings }}</span>
                }
              </div>
              @if (recipe.categories.length > 0) {
                <div class="categories">
                  @for (cat of recipe.categories; track cat) {
                    <span class="tag">{{ cat }}</span>
                  }
                </div>
              }
            </a>
          </article>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .recipe-list-container {
        max-width: 960px;
        margin: 0 auto;
        padding: 24px;
      }
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .list-header h2 {
        margin: 0;
      }
      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .btn-import {
        background: var(--rm-primary-surface);
        color: var(--rm-primary);
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 600;
      }
      .btn-new {
        background: var(--rm-primary);
        color: #fff;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 600;
      }
      .loading,
      .empty {
        text-align: center;
        color: var(--rm-text-secondary);
        padding: 40px 0;
      }
      .error {
        color: var(--rm-danger);
        text-align: center;
      }
      .recipe-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      .recipe-card {
        background: var(--rm-surface);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 12px var(--rm-shadow);
        border: 1px solid var(--rm-border);
        transition: box-shadow 0.2s;
      }
      .recipe-card:hover {
        box-shadow: 0 4px 20px var(--rm-shadow);
      }
      .card-link {
        display: block;
        padding: 20px;
        text-decoration: none;
        color: inherit;
      }
      .card-link h3 {
        margin: 0 0 8px;
        color: var(--rm-text);
      }
      .description {
        color: var(--rm-text-secondary);
        font-size: 0.9rem;
        margin: 0 0 12px;
        line-height: 1.4;
      }
      .meta {
        display: flex;
        gap: 12px;
        font-size: 0.85rem;
        color: var(--rm-text-secondary);
        margin-bottom: 12px;
      }
      .categories {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tag {
        background: var(--rm-primary-surface);
        color: var(--rm-primary);
        font-size: 0.78rem;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeListComponent implements OnInit {
  recipes: Recipe[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly recipeService: RecipeService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.recipeService.getRecipes().subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('RECIPES.LIST.LOAD_ERROR');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
