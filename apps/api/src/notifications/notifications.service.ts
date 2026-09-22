import { Injectable } from '@nestjs/common';
import { map,Observable, Subject } from 'rxjs';

import type { NotificationEvent } from './notification-event.interface';

export interface SseMessage {
  data: string;
}

@Injectable()
export class NotificationsService {
  private readonly events = new Subject<NotificationEvent>();

  emit(event: Omit<NotificationEvent, 'createdAt'>): void {
    this.events.next({ ...event, createdAt: new Date().toISOString() });
  }

  getStream(): Observable<SseMessage> {
    return this.events.asObservable().pipe(
      map((event) => ({ data: JSON.stringify(event) })),
    );
  }
}
