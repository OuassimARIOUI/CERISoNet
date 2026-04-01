import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { PostService } from '../../services/post';
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

  // Variables pour la gestion des posts
  posts: any[] = [];
  currentPage: number = 0;
  isLoading: boolean = false;
  hasMore: boolean = true;

  constructor(
    private authService: Auth,
    private postService: PostService,
    public notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const prev = localStorage.getItem('previousLogin');
    this.derniereConnexion = prev ? prev : '';

    this.authService.getWall().subscribe({
      next: (response) => {
        this.userId = response.userId;
        this.authOk = true;
        // La session est valide, on charge les premiers posts !
        this.loadPosts(); 
      },
      error: () => {
        this.notifService.show('Session expirée. Veuillez vous reconnecter.', 'error');
        this.router.navigate(['/login']);
      }
    });
  }

  loadPosts(): void {
    if (this.isLoading || !this.hasMore) return;

    this.isLoading = true;
    this.postService.getPosts(this.currentPage).subscribe({
      next: (response) => {
        if (response.success) {
          // On ajoute les nouveaux posts à la liste existante
          this.posts = [...this.posts, ...response.posts];
          this.isLoading = false;
          
          // Si on a reçu moins de 20 posts, c'est qu'il n'y en a plus à charger en base
          if (response.posts.length < 20) {
            this.hasMore = false;
          } else {
            this.currentPage++; // On incrémente pour le prochain clic
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.notifService.show('Erreur lors du chargement des posts.', 'error');
        console.error('Erreur getPosts:', err);
      }
    });
  }
}