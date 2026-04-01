import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // <-- IMPORT AJOUTÉ
import { Auth } from '../../services/auth';
import { PostService } from '../../services/post';
import { NotificationService } from '../../services/notification';
import { Notification } from '../../components/notification/notification';

@Component({
  selector: 'app-wall',
  imports: [CommonModule, Notification, ReactiveFormsModule], 
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

  // Formulaire de publication
  postForm: FormGroup;
  isPublishing: boolean = false;

  constructor(
    private authService: Auth,
    private postService: PostService,
    public notifService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder 
  ) {
    // Initialisation du formulaire
    this.postForm = this.fb.group({
      body: ['', [Validators.required, Validators.maxLength(500)]],
      hashtags: [''],
      imageUrl: [''],   
      imageTitle: ['']
    });
  }

  ngOnInit(): void {
    const prev = localStorage.getItem('previousLogin');
    this.derniereConnexion = prev ? prev : '';

    this.authService.getWall().subscribe({
      next: (response) => {
        this.userId = response.userId;
        this.authOk = true;
        this.cdr.detectChanges();
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
          this.cdr.detectChanges(); 
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.notifService.show('Erreur lors du chargement des posts.', 'error');
      }
    });
  }

  
  onSubmitPost(): void {
    if (this.postForm.invalid) return;

    this.isPublishing = true;
    const { body, hashtags, imageUrl, imageTitle } = this.postForm.value;

    this.postService.createPost(body, hashtags, imageUrl, imageTitle).subscribe({
      next: (response) => {
        if (response.success) {
          
          // tout en haut de la liste sans avoir à recharger la page entière !
          this.posts.unshift(response.post);
          
          this.notifService.show('Post publié avec succès !', 'success');
          this.postForm.reset(); // On vide le formulaire
          this.isPublishing = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isPublishing = false;
        this.notifService.show('Erreur lors de la publication.', 'error');
        console.error('Erreur createPost:', err);
      }
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: (response) => {

        // On affiche un message de succès
        this.notifService.show('Vous avez été déconnecté avec succès.', 'success');

        // On redirige vers la page de login
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Erreur de déconnexion:', err);

        this.notifService.show('Erreur lors de la déconnexion.', 'error');
        
        // On redirige quand même par sécurité
        this.router.navigate(['/login']);
      }
    });
  }

}