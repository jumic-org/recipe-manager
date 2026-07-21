import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { ConfigService } from './config/config.service';

function initializeApp(): () => Promise<void> {
  const configService = inject(ConfigService);
  return () => configService.load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(appRoutes),
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
  ],
};
