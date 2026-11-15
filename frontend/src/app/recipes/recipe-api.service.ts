import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { ListRecipesResponse } from '@recipe-manager/shared';
import { ConfigService } from '../config';

@Injectable({ providedIn: 'root' })
export class RecipeApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  list() {
    return this.http
      .get<ListRecipesResponse>(`${this.config.value.apiUrl}/recipes`)
      .pipe(map((response) => response.recipes));
  }
}
