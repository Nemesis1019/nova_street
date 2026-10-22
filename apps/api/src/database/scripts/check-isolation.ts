/**
 * Smoke test de aislamiento multi-tenant contra una API en ejecución.
 * Verifica que una sesión de un tenant no sirve en otro y que los catálogos
 * son distintos. No modifica datos.
 *
 * Uso: pnpm --filter api check:isolation
 */
const API = process.env.API_URL ?? 'http://localhost:4000';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`✖ ${message}`);
}

async function main() {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant': 'nova' },
    body: JSON.stringify({ email: 'customer@tienda.com', password: 'Customer1234' }),
  });
  assert(login.ok, `login del cliente de nova falló (${login.status})`);
  const { accessToken } = (await login.json()) as { accessToken: string };
  assert(accessToken, 'login sin accessToken');

  const meNova = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant': 'nova' },
  });
  assert(meNova.status === 200, `el token de nova no funciona en nova (${meNova.status})`);

  const meDemo = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant': 'demo' },
  });
  assert(meDemo.status === 401, `el token de nova fue aceptado en demo (${meDemo.status})`);

  const customerInDemo = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant': 'demo' },
    body: JSON.stringify({ email: 'customer@tienda.com', password: 'Customer1234' }),
  });
  assert(
    customerInDemo.status === 401,
    `un cliente de nova pudo loguearse en demo (${customerInDemo.status})`,
  );

  const catalog = async (tenant: string) => {
    const res = await fetch(`${API}/catalog/products?limit=100`, { headers: { 'X-Tenant': tenant } });
    assert(res.ok, `catálogo de ${tenant} falló (${res.status})`);
    return res.text();
  };

  const nova = await catalog('nova');
  const demo = await catalog('demo');
  assert(nova !== demo, 'los catálogos de nova y demo son idénticos (¿misma BD?)');

  console.log('✔ Aislamiento OK: sesiones por tenant, login cruzado rechazado y catálogos distintos.');
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
