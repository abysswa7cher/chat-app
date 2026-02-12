// src/app/services/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { StorageService } from './storage';
import { environment } from '../../environment';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    is_admin: boolean;
  };
  expires_in: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);

  private apiUrl = environment.apiUrl;

  // Signal-based state
  private userSignal = signal<User | null>(this.getStoredUser());
  currentUser = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  // Initialize and verify session on app load
  async initializeAuth(): Promise<void> {
    const token = this.getAccessToken();

    if (!token) {
      this.userSignal.set(null);
      return;
    }

    try {
      // Try to verify current token by fetching user info
      const user = await this.verifyToken().toPromise();
      if (user) {
        this.userSignal.set(user);
      }
    } catch (error: any) {
      // Token invalid, try to refresh
      if (error.status === 401) {
        await this.tryRefreshToken();
      } else {
        this.logout();
      }
    }
  }

  // Verify token by calling /api/auth/me
  private verifyToken(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  // Try to refresh the access token
  private async tryRefreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.logout();
      return;
    }

    try {
      const response = await firstValueFrom(this.http.post<LoginResponse>(
        `${this.apiUrl}/auth/refresh`,
        { refresh_token: refreshToken }
      ));

      if (response) {
        this.storage.setItem('access_token', response.access_token);
        this.storage.setItem('refresh_token', response.refresh_token);
        this.storage.setItem('user', JSON.stringify(response.user));
        this.userSignal.set(response.user);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        this.storage.setItem('access_token', response.access_token);
        this.storage.setItem('refresh_token', response.refresh_token);
        this.storage.setItem('user', JSON.stringify(response.user));
        this.userSignal.set(response.user);
      })
    );
  }

  logout(): void {
    this.storage.removeItem('access_token');
    this.storage.removeItem('refresh_token');
    this.storage.removeItem('user');
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.storage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return this.storage.getItem('refresh_token');
  }

  private getStoredUser(): User | null {
    const userStr = this.storage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Helper for backward compatibility
  getCurrentUser(): User | null {
    return this.userSignal();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}