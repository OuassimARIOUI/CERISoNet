import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Wall } from './pages/wall/wall';
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Route par défaut
  { path: 'login', component: Login },
  { path: 'wall', component: Wall },
  { path: '**', redirectTo: '/login' } // Route wildcard pour les 404
];
