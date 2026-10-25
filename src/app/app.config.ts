import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withRouterResources,
} from '@angular/router';
import { fakeBackend } from './api';
import { log } from './log';
import { routes } from './routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([fakeBackend])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterResources(),
      withNavigationErrorHandler((e) => log(`navigation error handler: ${e.url}`)),
    ),
  ],
};
