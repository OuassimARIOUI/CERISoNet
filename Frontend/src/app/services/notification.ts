import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  message: string = '';
  type: 'success' | 'error' | '' = '';
  private timer: any = null;

  constructor(private zone: NgZone) {}

  show(message: string, type: 'success' | 'error') {
    this.message = message;
    this.type = type;
    if (this.timer) clearTimeout(this.timer);
    this.timer = this.zone.runOutsideAngular(() =>
      setTimeout(() => {
        this.zone.run(() => this.clear());
      }, 5000)
    );
  }

  clear() {
    this.message = '';
    this.type = '';
    this.timer = null;
  }
}
