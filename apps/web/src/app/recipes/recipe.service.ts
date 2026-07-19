import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recipe, CreateRecipeInput, UpdateRecipeInput } from '@recipe-manager/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly baseUrl = `${environment.apiUrl}/recipes`;

  constructor(private readonly http: HttpClient) {}

  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.baseUrl);
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/${id}`);
  }

  createRecipe(input: CreateRecipeInput): Observable<Recipe> {
    return this.http.post<Recipe>(this.baseUrl, input);
  }

  updateRecipe(id: string, input: UpdateRecipeInput): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.baseUrl}/${id}`, input);
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
