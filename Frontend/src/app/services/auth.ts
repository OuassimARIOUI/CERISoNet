import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private baseUrl = 'https://pedago.univ-avignon.fr:3127'; 

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/login`, {
      email: email,
      password: password
    }, { withCredentials: true }); // nécessaire pour envoyer/recevoir le cookie de session
  }

  getWall(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/wall`, { withCredentials: true });
  }
}
