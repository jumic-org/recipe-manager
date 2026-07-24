import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { IngredientOnHand } from '@recipe-manager/shared';
import { ConfigService } from '../config/config.service';

@Injectable({ providedIn: 'root' })
export class PantryService {
  private readonly configService = inject(ConfigService);
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/ingredients-on-hand`;
  }

  getIngredientsOnHand(): Observable<IngredientOnHand[]> {
    return this.http
      .get<{ items: IngredientOnHand[] }>(this.baseUrl)
      .pipe(map((res) => res.items));
  }

  addIngredient(name: string): Observable<IngredientOnHand> {
    return this.http
      .post<{ item: IngredientOnHand }>(this.baseUrl, { name })
      .pipe(map((res) => res.item));
  }

  deleteIngredient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
