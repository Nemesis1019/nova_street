import { Injectable } from '@nestjs/common';
import { filter, map, Observable, Subject } from 'rxjs';

import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import type { NotificationEvent } from './notification-event.interface';

export interface SseMessage {
  data: string;
}

@Injectable()
export class NotificationsService {
  private readonly events = new Subject<NotificationEvent>();

  emit(event: Omit<NotificationEvent, 'createdAt' | 'tenantSlug'>): void {
    // Cada evento queda etiquetado con el tenant que lo originó; el stream de
    // cada admin solo entrega los de su propio cliente.
    this.events.next({
      ...event,
      tenantSlug: getCurrentTenantSlug() ?? undefined,
      createdAt: new Date().toISOString(),
    });
  }

  getStream(): Observable<SseMessage> {
    const tenantSlug = getCurrentTenantSlug();
    return this.events.asObservable().pipe(
      filter((event) => !tenantSlug || !event.tenantSlug || event.tenantSlug === tenantSlug),
      map((event) => ({ data: JSON.stringify(event) })),
    );
  }
}
