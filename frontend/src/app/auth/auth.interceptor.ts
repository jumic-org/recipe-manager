import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { ConfigService } from '../config';
import { AuthService } from './auth.service';

/** Adds the access token to calls to the Recipe Manager API. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(ConfigService).value.apiUrl;
  if (!request.url.startsWith(apiUrl)) return next(request);
  return from(inject(AuthService).accessToken()).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
  );
};
