// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth';
import { AuthService } from './services/auth';

// Factory function to initialize auth on app startup
export function initializeAuth(authService: AuthService) {
  return () => authService.initializeAuth();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initializeAuth();
    })
  ]
};