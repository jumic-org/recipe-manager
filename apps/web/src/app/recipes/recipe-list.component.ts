import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Recipe } from '@recipe-manager/shared';
import { RecipeService } from './recipe.service';

@Component({
  selector: 'rm-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="recipe-list-container">
      <div class="list-header">
        <h2>My Recipes</h2>
        <a routerLink="/recipes/new" class="btn-new">New Recipe</a>
      </div>
      @if (loading) {
        <p class="loading">Loading recipes...</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (!loading && recipes.length === 0 && !error) {
        <p class="empty">No recipes yet. Create your first recipe!</p>
      }
      <div class="recipe-grid">
        @for (recipe of recipes; track recipe.id) {
          <article class="recipe-card">
            <a [routerLink]="['/recipes', recipe.id]" class="card-link">
              <h3>{{ recipe.title }}</h3>
              <p class="description">{{ recipe.description }}</p>
              <div class="meta">
                @if (recipe.prepTimeMinutes) {
                  <span>Prep: {{ recipe.prepTimeMinutes }}min</span>
                }
                @if (recipe.cookTimeMinutes) {
                  <span>Cook: {{ recipe.cookTimeMinutes }}min</span>
                }
                @if (recipe.servings) {
                  <span>Serves: {{ recipe.servings }}</span>
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
  styles: [`
    .recipe-list-container { max-width: 960px; margin: 0 auto; padding: 24px; }
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .list-header h2 { margin: 0; }
    .btn-new {
      background: #1c5b55; color: #fff; text-decoration: none;
      padding: 10px 20px; border-radius: 6px; font-weight: 600;
    }
    .loading, .empty { text-align: center; color: #666; padding: 40px 0; }
    .error { color: #c0392b; text-align: center; }
    .recipe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .recipe-card {
      background: #fff; border-radius: 8px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); border: 1px solid #eee;
      transition: box-shadow 0.2s;
    }
    .recipe-card:hover { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
    .card-link { display: block; padding: 20px; text-decoration: none; color: inherit; }
    .card-link h3 { margin: 0 0 8px; color: #20201d; }
    .description { color: #666; font-size: 0.9rem; margin: 0 0 12px; line-height: 1.4; }
    .meta { display: flex; gap: 12px; font-size: 0.85rem; color: #888; margin-bottom: 12px; }
    .categories { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      background: #e8f5f3; color: #1c5b55; font-size: 0.78rem;
      padding: 4px 8px; border-radius: 4px; font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeListComponent implements OnInit {
  recipes: Recipe[] = [];
  loading = false;
  error = '';

  constructor(private readonly recipeService: RecipeService) {}

  ngOnInit(): void {
    this.loading = true;
    this.recipeService.getRecipes().subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load recipes';
        this.loading = false;
      }
    });
  }
}
