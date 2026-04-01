import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  message = signal<string>('');
  type = signal<'success' | 'error' | ''>('');
  private timer: any = null;

  constructor() {}

  show(msg: string, t: 'success' | 'error') {
    this.message.set(msg);
    this.type.set(t);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.clear();
    }, 5000);
  }

  clear() {
    this.message.set('');
    this.type.set('');
    this.timer = null;
  }
}