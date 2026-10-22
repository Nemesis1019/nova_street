import { tenantStorage } from '../tenant/tenant-runtime';
import { NotificationsService } from './notifications.service';

const demo = {
  id: 'demo-id',
  slug: 'demo',
  name: 'Demo',
  status: 'ACTIVE' as const,
  databaseUrl: 'postgresql://localhost/demo',
  primaryDomain: null,
  domains: [],
  r2: {},
};

const nova = { ...demo, id: 'nova-id', slug: 'nova', name: 'Nova' };

describe('NotificationsService — aislamiento SSE', () => {
  it('solo entrega eventos del tenant de la conexión', () => {
    const service = new NotificationsService();
    const received: Array<{ tenantSlug?: string }> = [];

    const subscription = tenantStorage.run(demo, () =>
      service.getStream().subscribe((message) => received.push(JSON.parse(message.data))),
    );

    tenantStorage.run(nova, () => service.emit({ type: 'order.created', payload: { order: 'nova' } }));
    tenantStorage.run(demo, () => service.emit({ type: 'order.created', payload: { order: 'demo' } }));

    subscription.unsubscribe();

    expect(received).toHaveLength(1);
    expect(received[0].tenantSlug).toBe('demo');
  });
});
