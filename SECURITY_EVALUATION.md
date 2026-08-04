# Evaluación: UUIDs + cifrado de payloads

Este documento resume los pros y contras de agregar un enfoque de comunicaciones con **payload cifrado** y **UUIDs** al e-commerce, para decidir si se asigna como tarea o no.

---

## 1. Opción A: UUIDs como identificadores públicos

### Estado actual
El schema de Prisma ya usa `@id @default(uuid())` en la mayoría de los modelos, por lo que técnicamente ya no se exponen IDs secuenciales.

### Pros
- **Ofuscación básica:** un atacante no puede recorrer recursos incrementando números (`/orders/1`, `/orders/2`, etc.).
- **Sin colisiones** entre instancias o regiones si el proyecto escala.
- **Bajo costo de implementación:** no requiere cambios grandes en la base de datos.

### Contras
- Los UUIDs solos **no cifran el contenido**: si alguien intercepta el tráfico, sigue viendo precios, direcciones, etc.
- Son más largos y ligeramente más lentos de indexar que un `bigint`, aunque en esta escala es negligible.

---

## 2. Opción B: Cifrado de payloads (end-to-end encryption del body)

Esto implicaría cifrar el body de cada request/response en el cliente y descifrarlo en el servidor, además de usar TLS.

### Pros
- **Confidencialidad extra:** aunque alguien inspeccione logs de proxy, WAF o browser devtools sin TLS, el payload es ilegible.
- **Integridad:** se puede agregar firma (HMAC) para detectar modificaciones en tránsito.
- **Compliance:** facilita auditorías si en el futuro se manejan datos financieros o sensibles.
- **Ofuscación de IDs y estructura:** el atacante no ve ni los UUIDs ni la forma del JSON.

### Contras
- **Complejidad enorme:**
  - Gestión de claves (intercambio, rotación, almacenamiento seguro en el cliente).
  - El frontend (y cualquier cliente mobile) debe cifrar/descifrar con libsodium o WebCrypto.
  - Swagger/OpenAPI y `api-types` pierden utilidad porque los bodies se convierten en blobs base64.
- **Debugging más difícil:** no se pueden ver requests/responses fácilmente en DevTools, Sentry o logs del servidor.
- **Performance:** cifrado/descifrado en cada request, más overhead de base64 (~33% más payload).
- **Tests e2e más engorrosos:** hay que cifrar/descifrar en cada test.
- **TLS ya resuelve mucho:** si el ataque es MITM en red, HTTPS lo mitiga. Si el ataque es XSS o malware en el cliente, el cifrado no ayuda porque la clave está en el cliente.
- **Cache/CDN:** los payloads cifrados no se cachean ni inspeccionan bien por proxies.

---

## 3. Recomendación

Para este proyecto **no se recomienda asignar el cifrado de payloads como tarea prioritaria**.

Es más rentable invertir el esfuerzo en:

1. **Mantener UUIDs** (ya se hace en gran medida).
2. **Asegurar headers de seguridad:** CORS correcto, CSP, HSTS, cookies `Secure` + `HttpOnly`.
3. **Sanitizar inputs y validar DTOs** (ya se hace con class-validator).
4. **Rate limiting** en auth, checkout y endpoints de pago.
5. **Auditoría de autorización:** asegurar que un usuario no pueda ver/Modificar recursos de otro (órdenes, direcciones, diseños).

Si más adelante se decide subir el nivel de seguridad, el cifrado de payloads debería aplicarse **solo en endpoints muy sensibles** (datos de tarjeta, documentos de identidad, etc.), no en todo el API.

---

## 4. Si se decide implementarlo: enfoque híbrido sugerido

- **Fase 1 (baja complejidad):** auditar que **todos** los IDs expuestos sean UUIDs y que no haya autoincrementales filtrados en respuestas o URLs.
- **Fase 2 (opcional):** cifrar payloads de endpoints críticos usando **AES-GCM** + clave derivada de un secreto compartido, con un middleware en NestJS y un interceptor en el cliente.

---

## 5. Conclusión

- **UUIDs:** ya están. Recomendable mantenerlos y auditar que no queden IDs numéricos expuestos.
- **Cifrado de payloads:** útil en contextos de alto riesgo o compliance, pero introduce mucha complejidad operativa y de desarrollo para un MVP.

**Decisión pendiente:** asignar como tarea de baja prioridad, descartar por ahora, o implementar solo en endpoints críticos.
