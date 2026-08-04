# Spec: Autenticación y Usuarios

## Objetivo
Permitir que usuarios (clientes y administradores) se registren, inicien sesión, gestionen su perfil y cierren sesión de forma segura en la plataforma.

## Alcance
- Registro de usuarios con email y contraseña.
- Inicio de sesión con email y contraseña.
- Emisión de access token (JWT) y refresh token.
- Renovación de access token mediante refresh token.
- Cierre de sesión con invalidación del refresh token.
- Recuperación básica de perfil del usuario autenticado.
- Roles iniciales: `Customer` y `Admin`.
- Gestión de direcciones del usuario.

## Fuera de alcance
- Autenticación social (Google, Facebook, etc.).
- Checkout como invitado (se define en spec separada).
- Multi-factor authentication (MFA).
- Recuperación de contraseña por email.
- Gestión granular de permisos (solo roles en esta versión).

## Apps afectadas
- `apps/api`
- `apps/web`
- `apps/admin`

## Roles involucrados
- `Customer`: usuario final de la tienda.
- `Admin`: usuario del panel administrativo.

## Casos de uso
1. Un visitante se registra en la tienda con email y contraseña.
2. Un usuario registrado inicia sesión y recibe tokens.
3. Un usuario autenticado consulta su perfil.
4. Un usuario autenticado cierra sesión.
5. Un usuario actualiza sus datos personales.
6. Un usuario agrega/edita/elimina direcciones de envío.
7. Un administrador inicia sesión en `apps/admin`.

## Reglas de negocio
- El email debe ser único en toda la plataforma.
- La contraseña debe tener mínimo 8 caracteres, al menos una letra y un número.
- Los passwords se almacenan hasheados con Argon2.
- El refresh token es único, rotatorio y se invalida al cerrar sesión.
- El access token expira en 15 minutos; el refresh token en 7 días.
- Los tokens no se almacenan en cookies inseguras por defecto (Bearer header).
- `apps/admin` requiere rol `Admin` para acceder a funciones administrativas.

## Modelo de datos

```txt
User
  id: UUID
  email: String @unique
  passwordHash: String
  firstName: String
  lastName: String
  phone: String?
  isActive: Boolean
  emailVerified: Boolean
  roleId: UUID
  createdAt: DateTime
  updatedAt: DateTime

Role
  id: UUID
  name: String @unique (CUSTOMER, ADMIN)
  description: String?
  createdAt: DateTime
  updatedAt: DateTime

RefreshToken
  id: UUID
  userId: UUID
  tokenHash: String
  expiresAt: DateTime
  revokedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime

Address
  id: UUID
  userId: UUID
  label: String
  line1: String
  line2: String?
  city: String
  state: String
  country: String
  zipCode: String
  phone: String?
  isDefault: Boolean
  createdAt: DateTime
  updatedAt: DateTime
```

## API

### Auth

**POST /auth/register**
```json
{
  "email": "cliente@example.com",
  "password": "Secure1234",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```
Response 201:
```json
{
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "CUSTOMER" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

**POST /auth/login**
```json
{
  "email": "cliente@example.com",
  "password": "Secure1234"
}
```
Response 200: mismo formato que register.

**POST /auth/refresh**
```json
{
  "refreshToken": "..."
}
```
Response 200:
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

**POST /auth/logout**
Headers: `Authorization: Bearer <accessToken>`
Body: `{ "refreshToken": "..." }`
Response 204.

**GET /auth/me**
Headers: `Authorization: Bearer <accessToken>`
Response 200:
```json
{
  "id": "...",
  "email": "...",
  "firstName": "...",
  "lastName": "...",
  "role": "CUSTOMER"
}
```

### Users

**PATCH /users/me**
Headers: `Authorization: Bearer <accessToken>`
Body: `{ "firstName": "...", "lastName": "...", "phone": "..." }`

**GET /users/me/addresses**
**POST /users/me/addresses**
**PATCH /users/me/addresses/:id**
**DELETE /users/me/addresses/:id**

## UI / UX

### `apps/web`
- Página `/auth/login` con formulario email/contraseña.
- Página `/auth/register` con formulario de registro.
- Link o botón de logout en header.
- Página `/account/profile` para editar datos personales.
- Página `/account/addresses` para gestionar direcciones.

### `apps/admin`
- Página `/login` para administradores.
- Header con logout.
- No se permite registro público de administradores.

## Validaciones

### Backend
- Email válido y único.
- Password >= 8 caracteres, al menos 1 letra y 1 número.
- FirstName y LastName requeridos, máximo 100 caracteres.
- Address sigue el schema compartido `AddressSchema`.

### Frontend
- Mismas validaciones con Zod + React Hook Form.
- Mensajes de error claros en español.

## Permisos
- `POST /auth/register`: pública.
- `POST /auth/login`: pública.
- `POST /auth/refresh`: pública.
- `POST /auth/logout`: autenticada.
- `GET /auth/me`: autenticada.
- `PATCH /users/me`: autenticada (solo propio).
- Direcciones: autenticada (solo propias).
- Funciones de `apps/admin`: requiere rol `Admin`.

## Estados de carga y error
- Loading en botones de submit.
- Error de credenciales inválidas.
- Error de email ya registrado.
- Error de token expirado/inválido (401).
- Error de acceso prohibido (403) en admin.
- Empty state en lista de direcciones.

## Criterios de aceptación
- [ ] Usuario puede registrarse, loguearse y recibir tokens.
- [ ] Usuario puede cerrar sesión e invalidar refresh token.
- [ ] Access token expira y puede renovarse con refresh token.
- [ ] Usuario puede ver y editar su perfil.
- [ ] Usuario puede gestionar direcciones.
- [ ] Admin puede loguearse en `apps/admin`.
- [ ] Endpoints protegidos rechazan tokens inválidos.
- [ ] No se expone password hash en responses.
- [ ] Tests de integración para login, registro y logout.

## Testing mínimo
- Tests de integración para registro, login, refresh, logout.
- Tests de servicio de hashing de passwords.
- Tests de guards JWT.
- Tests e2e de flujo completo de autenticación.

## Observaciones técnicas
- Se usará `@nestjs/jwt` y `argon2` en el backend.
- Los refresh tokens se almacenan en base de datos para permitir revocación.
- La estrategia de roles se implementará con un `RolesGuard` simple antes de migrar a CASL/permisos granulares.
