import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { Notification } from '../../components/notification/notification';

@Component({
  selector: 'app-wall',
  imports: [CommonModule, Notification],
  templateUrl: './wall.html',
  styleUrl: './wall.css'
})
export class Wall implements OnInit {
  userId: number | null = null;
  derniereConnexion: string = '';
  authOk: boolean = false;

  constructor(private authService: Auth, public notifService: NotificationService, private router: Router) {}

  ngOnInit(): void {
    const prev = localStorage.getItem('previousLogin');
    this.derniereConnexion = prev ? prev : '';

    this.authService.getWall().subscribe({
      next: (response) => {
        this.userId = response.userId;
        this.authOk = true;
      },
      error: () => {
        this.notifService.show('Session expirée. Veuillez vous reconnecter.', 'error');
        this.router.navigate(['/login']);
      }
    });
  }
}