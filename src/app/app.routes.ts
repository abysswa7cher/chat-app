// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { ChatComponent } from './pages/chat/chat';
import { authGuard } from './guards/auth-guard';
import { Registration } from './pages/registration/registration';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
    { path: 'register', component: Registration },
    { path: '**', redirectTo: '/login' }
];