import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Recipe, CreateRecipeInput, UpdateRecipeInput } from '@recipe-manager/shared';
import { ConfigService } from '../config/config.service';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly configService = inject(ConfigService);
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/recipes`;
  }

  getRecipes(): Observable<Recipe[]> {
    return this.http.get<{ recipes: Recipe[] }>(this.baseUrl).pipe(map((res) => res.recipes));
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http
      .get<{ recipe: Recipe }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.recipe));
  }

  createRecipe(input: CreateRecipeInput): Observable<Recipe> {
    return this.http.post<{ recipe: Recipe }>(this.baseUrl, input).pipe(map((res) => res.recipe));
  }

  updateRecipe(id: string, input: UpdateRecipeInput): Observable<Recipe> {
    return this.http
      .put<{ recipe: Recipe }>(`${this.baseUrl}/${id}`, input)
      .pipe(map((res) => res.recipe));
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  importRecipe(url: string): Observable<Recipe> {
    return this.http
      .post<{ recipe: Recipe }>(`${this.baseUrl}/import`, { url })
      .pipe(map((res) => res.recipe));
  }
}
