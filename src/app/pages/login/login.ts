// src/app/pages/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

interface LoginData {
  email: string;
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  })

  email = '';
  password = '';
  loading = false;

  ngOnInit() {
    // If already authenticated, redirect to chat
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/chat']);
    } else {
      // re-routed from registration - fill username
      const username = this.route.snapshot.queryParamMap.get('username') ?? "";
      if (username.length) this.loginForm.get('username')?.setValue(username);
    }
  }

  onSubmit(): void {
    if (this.loginForm.errors) {
      return;
    }

    this.loading = true;
    const username = this.loginForm.get('username')?.value ?? "";
    const password = this.loginForm.get('password')?.value ?? "";

    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/chat']);
      },
      error: (error) => {
        this.loading = false;
        console.error('Login error:', error);
      }
    });
  }
}