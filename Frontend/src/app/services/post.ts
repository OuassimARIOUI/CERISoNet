import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private baseUrl = 'https://pedago.univ-avignon.fr:3127';

  constructor(private http: HttpClient) {}

  // On passe le numéro de la page, 0 par défaut
  getPosts(page: number = 0): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/posts?page=${page}`, { 
      withCredentials: true // Indispensable pour envoyer le cookie de session MongoDB !
    });
  }
}