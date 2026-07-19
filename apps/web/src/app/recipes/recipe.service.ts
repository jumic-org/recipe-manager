import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Recipe, CreateRecipeInput, UpdateRecipeInput } from '@recipe-manager/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly baseUrl = `${environment.apiUrl}/recipes`;

  constructor(private readonly http: HttpClient) {}

  getRecipes(): Observable<Recipe[]> {
    return this.http
      .get<{ recipes: Recipe[] }>(this.baseUrl)
      .pipe(map((res) => res.recipes));
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http
      .get<{ recipe: Recipe }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.recipe));
  }

  createRecipe(input: CreateRecipeInput): Observable<Recipe> {
    return this.http
      .post<{ recipe: Recipe }>(this.baseUrl, input)
      .pipe(map((res) => res.recipe));
  }

  updateRecipe(id: string, input: UpdateRecipeInput): Observable<Recipe> {
    return this.http
      .put<{ recipe: Recipe }>(`${this.baseUrl}/${id}`, input)
      .pipe(map((res) => res.recipe));
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
