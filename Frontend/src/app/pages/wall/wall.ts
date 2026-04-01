// 1. Ajoute ChangeDetectorRef dans tes imports
import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
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

  posts: any[] = [];
  currentPage: number = 0;
  isLoading: boolean = false;
  hasMore: boolean = true;

  constructor(
    private authService: Auth,
    private postService: PostService,
    public notifService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef // 2. Injecte-le ici
  ) {}

  ngOnInit(): void {
    const prev = localStorage.getItem('previousLogin');
    this.derniereConnexion = prev ? prev : '';

    this.authService.getWall().subscribe({
      next: (response) => {
        this.userId = response.userId;
        this.authOk = true;
        this.cdr.detectChanges(); // 3. Force Angular à afficher le div authOk
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
          this.posts = [...this.posts, ...response.posts];
          this.isLoading = false;
          
          if (response.posts.length < 20) {
            this.hasMore = false;
          } else {
            this.currentPage++;
          }
          
          // 4. Force Angular à dessiner les nouveaux posts à l'écran !
          this.cdr.detectChanges(); 
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