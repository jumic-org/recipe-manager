import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { Supermarket } from '@recipe-manager/shared';
import { SupermarketService } from './supermarket.service';

@Component({
  selector: 'rm-supermarket-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="supermarket-list-container">
      <div class="list-header">
        <h2>{{ 'SUPERMARKETS.LIST.TITLE' | translate }}</h2>
        <a routerLink="/supermarkets/new" class="btn-new">{{
          'SUPERMARKETS.LIST.NEW' | translate
        }}</a>
      </div>
      @if (loading) {
        <p class="loading">{{ 'SUPERMARKETS.LIST.LOADING' | translate }}</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      @if (!loading && supermarkets.length === 0 && !error) {
        <p class="empty">{{ 'SUPERMARKETS.LIST.EMPTY' | translate }}</p>
      }
      <ul class="supermarket-items">
        @for (sm of supermarkets; track sm.id) {
          <li class="supermarket-item">
            <div class="item-info">
              <strong>{{ sm.name }}</strong>
              <span class="aisle-count">{{
                'SUPERMARKETS.LIST.AISLES_COUNT'
                  | translate: { count: sm.aisles.length }
              }}</span>
            </div>
            <div class="item-actions">
              <a [routerLink]="['/supermarkets', sm.id, 'edit']" class="btn-edit">{{
                'SUPERMARKETS.LIST.EDIT' | translate
              }}</a>
              <button class="btn-delete" (click)="deleteSupermarket(sm.id)">
                {{ 'SUPERMARKETS.LIST.DELETE' | translate }}
              </button>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .supermarket-list-container {
        max-width: 700px;
        margin: 0 auto;
        padding: 24px;
      }
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .list-header h2 {
        margin: 0;
      }
      .btn-new {
        background: var(--rm-primary);
        color: #fff;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 600;
      }
      .loading,
      .empty {
        text-align: center;
        color: var(--rm-text-secondary);
        padding: 20px 0;
      }
      .error {
        color: var(--rm-danger);
        text-align: center;
      }
      .supermarket-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .supermarket-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--rm-surface);
        border: 1px solid var(--rm-border);
        border-radius: 6px;
        margin-bottom: 8px;
      }
      .item-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .aisle-count {
        font-size: 0.85rem;
        color: var(--rm-text-secondary);
      }
      .item-actions {
        display: flex;
        gap: 8px;
      }
      .btn-edit {
        background: var(--rm-primary-surface);
        color: var(--rm-primary);
        text-decoration: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .btn-delete {
        background: var(--rm-danger-surface);
        color: var(--rm-danger);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupermarketListComponent implements OnInit {
  supermarkets: Supermarket[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly supermarketService: SupermarketService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSupermarkets();
  }

  deleteSupermarket(id: string): void {
    if (!confirm(this.translateService.instant('SUPERMARKETS.LIST.CONFIRM_DELETE'))) return;
    this.supermarketService.deleteSupermarket(id).subscribe({
      next: () => {
        this.supermarkets = this.supermarkets.filter((s) => s.id !== id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('SUPERMARKETS.LIST.DELETE_ERROR');
        this.cdr.markForCheck();
      },
    });
  }

  private loadSupermarkets(): void {
    this.loading = true;
    this.supermarketService.getSupermarkets().subscribe({
      next: (items) => {
        this.supermarkets = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || this.translateService.instant('SUPERMARKETS.LIST.LOAD_ERROR');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
