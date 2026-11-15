import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, map, of, startWith } from 'rxjs';
import type { Recipe } from '@recipe-manager/shared';
import { RecipeApi } from './recipe-api.service';

type ListState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; recipes: Recipe[] };

@Component({
  selector: 'app-recipe-list',
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'recipes.title' | translate }}</h1>
    @switch (state().status) {
      @case ('loading') {
        <p>{{ 'recipes.loading' | translate }}</p>
      }
      @case ('error') {
        <p role="alert">{{ 'recipes.error' | translate }}</p>
      }
      @default {
        @if (recipes().length === 0) {
          <p class="empty">{{ 'recipes.empty' | translate }}</p>
        } @else {
          <ul>
            @for (recipe of recipes(); track recipe.id) {
              <li>{{ recipe.title }}</li>
            }
          </ul>
        }
      }
    }
  `,
})
export class RecipeListComponent {
  protected readonly state = toSignal(
    inject(RecipeApi)
      .list()
      .pipe(
        map((recipes): ListState => ({ status: 'ready', recipes })),
        catchError(() => of<ListState>({ status: 'error' })),
        startWith<ListState>({ status: 'loading' }),
      ),
    { requireSync: true },
  );

  protected recipes(): Recipe[] {
    const state = this.state();
    return state.status === 'ready' ? state.recipes : [];
  }
}
