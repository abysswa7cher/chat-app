import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from "@angular/material/input";
import { catchError, EMPTY } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  standalone: true,
  selector: 'app-registration.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Registration {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  snackBar = inject(MatSnackBar);

  loading = false;

  token = "";

  form = new FormGroup({
    username: new FormControl(''),
    password: new FormControl(''),
    confirm: new FormControl(''),
    inviteToken: new FormControl('')
  })

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? "";
    this.form.get('inviteToken')?.setValue(this.token);
  }

  onSubmit() {
    const username = this.form.get('username')?.value ?? "";
    const password = this.form.get('password')?.value ?? "";
    this.authService.register(username, password, this.token)
      .pipe(
        catchError(err => {
          this.snackBar.open(`Error: ${err.message}`, undefined, { duration: 3000 });
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open("Success! You may login now.", undefined, { duration: 3000 });
          this.router.navigate([`/login?username=${username}`]);
        }
      });

  }
}
