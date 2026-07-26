import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Supermarket, CreateSupermarketInput, UpdateSupermarketInput, Ingredient, Aisle } from '@recipe-manager/shared';
import { ConfigService } from '../config/config.service';

export interface AisleGroup {
  aisle: string;
  ingredients: Ingredient[];
}

@Injectable({ providedIn: 'root' })
export class SupermarketService {
  private readonly configService = inject(ConfigService);
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/supermarkets`;
  }

  getSupermarkets(): Observable<Supermarket[]> {
    return this.http
      .get<{ supermarkets: Supermarket[] }>(this.baseUrl)
      .pipe(map((res) => res.supermarkets));
  }

  getSupermarket(id: string): Observable<Supermarket> {
    return this.http
      .get<{ supermarkets: Supermarket[] }>(this.baseUrl)
      .pipe(
        map((res) => {
          const found = res.supermarkets.find((s) => s.id === id);
          if (!found) {
            throw new Error(`Supermarket with id "${id}" not found`);
          }
          return found;
        }),
      );
  }

  createSupermarket(input: CreateSupermarketInput): Observable<Supermarket> {
    return this.http
      .post<{ supermarket: Supermarket }>(this.baseUrl, input)
      .pipe(map((res) => res.supermarket));
  }

  updateSupermarket(id: string, input: UpdateSupermarketInput): Observable<Supermarket> {
    return this.http
      .put<{ supermarket: Supermarket }>(`${this.baseUrl}/${id}`, input)
      .pipe(map((res) => res.supermarket));
  }

  deleteSupermarket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  sortIngredients(ingredients: Ingredient[], aisles: Aisle[], language: string): Observable<AisleGroup[]> {
    const url = `${this.configService.apiUrl}/sort-ingredients`;
    return this.http
      .post<{ groups: AisleGroup[] }>(url, { ingredients, aisles, language })
      .pipe(map((res) => res.groups));
  }

  getPrompt(ingredients: Ingredient[], aisles: Aisle[], language: string): Observable<{ systemPrompt: string; userPrompt: string }> {
    const url = `${this.configService.apiUrl}/sort-ingredients-prompt`;
    return this.http
      .post<{ systemPrompt: string; userPrompt: string }>(url, { ingredients, aisles, language });
  }

  sortIngredientsManual(body: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    ingredients: Ingredient[];
    aisles: Aisle[];
  }): Observable<{ groups: AisleGroup[]; rawResponse: string }> {
    const url = `${this.configService.apiUrl}/sort-ingredients-manual`;
    return this.http.post<{ groups: AisleGroup[]; rawResponse: string }>(url, body);
  }
}
