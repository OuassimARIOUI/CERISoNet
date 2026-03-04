import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { Notification } from '../../components/notification/notification';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, Notification],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: Auth, private router: Router, public notifService: NotificationService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Login OK:', response);
          // Sauvegarde la connexion précédente avant de mettre à jour
          const derniere = localStorage.getItem('lastLogin');
          localStorage.setItem('previousLogin', derniere ?? '');
          localStorage.setItem('lastLogin', new Date().toLocaleString('fr-FR'));
          this.notifService.show('Connexion réussie !', 'success');
          this.router.navigate(['/wall']);
        },
        error: (error) => {
          console.error('Login error:', error);
          if (error.status === 401) {
            this.notifService.show('Email ou mot de passe incorrect.', 'error');
          } else {
            this.notifService.show('Erreur serveur (' + error.status + '). Réessaie.', 'error');
          }
        }
      });
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
