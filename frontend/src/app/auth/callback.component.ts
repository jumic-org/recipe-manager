import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  imports: [TranslatePipe],
  template: `
    @if (failed()) {
      <p role="alert">{{ 'auth.error' | translate }}</p>
      <button type="button" (click)="retry()">{{ 'auth.retry' | translate }}</button>
    } @else {
      <p>{{ 'auth.signingIn' | translate }}</p>
    }
  `,
})
export class CallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      await this.router.navigateByUrl(await this.auth.completeSignIn(), { replaceUrl: true });
    } catch {
      this.failed.set(true);
    }
  }

  protected retry(): Promise<void> {
    return this.auth.signIn('/');
  }
}
