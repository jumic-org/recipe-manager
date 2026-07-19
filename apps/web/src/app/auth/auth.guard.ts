import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.sessionChecked$.pipe(
    filter((checked) => checked),
    take(1),
    map(() => {
      if (authService.isAuthenticatedSync()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
