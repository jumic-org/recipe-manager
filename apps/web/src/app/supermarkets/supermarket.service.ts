import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Supermarket, CreateSupermarketInput, UpdateSupermarketInput } from '@recipe-manager/shared';
import { ConfigService } from '../config/config.service';

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
}
