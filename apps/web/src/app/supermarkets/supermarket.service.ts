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
      .get<{ items: Supermarket[] }>(this.baseUrl)
      .pipe(map((res) => res.items));
  }

  getSupermarket(id: string): Observable<Supermarket> {
    return this.http
      .get<{ items: Supermarket[] }>(this.baseUrl)
      .pipe(map((res) => res.items.find((s) => s.id === id) as Supermarket));
  }

  createSupermarket(input: CreateSupermarketInput): Observable<Supermarket> {
    return this.http
      .post<{ item: Supermarket }>(this.baseUrl, input)
      .pipe(map((res) => res.item));
  }

  updateSupermarket(id: string, input: UpdateSupermarketInput): Observable<Supermarket> {
    return this.http
      .put<{ item: Supermarket }>(`${this.baseUrl}/${id}`, input)
      .pipe(map((res) => res.item));
  }

  deleteSupermarket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
