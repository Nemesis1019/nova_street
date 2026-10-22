export interface EmailTemplateVariable {
  name: string;
  description: string;
  sample: string;
}

export interface EmailTemplateDefinition {
  key: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  text: string;
  variables: EmailTemplateVariable[];
}

const BUTTON_STYLE =
  'display:inline-block;padding:16px 24px;background:#0d0d0d;color:#fcf9f8;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;';

const storeNameVar: EmailTemplateVariable = {
  name: 'storeName',
  description: 'Nombre de la tienda',
  sample: 'NÖVA',
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: 'welcome',
    name: 'Bienvenida (registro)',
    description: 'Se envía cuando un cliente crea su cuenta.',
    subject: 'Bienvenido a {{storeName}}',
    html: `
      <h2>Hola, {{firstName}}</h2>
      <p>Tu cuenta en <strong>{{storeName}}</strong> fue creada exitosamente.</p>
      <p>Ya podés explorar el catálogo, guardar direcciones y seguir tus pedidos.</p>
      <a href="#" style="${BUTTON_STYLE}">Explorar ahora</a>
    `,
    text: 'Hola {{firstName}}, tu cuenta en {{storeName}} fue creada. Ya podés explorar el catálogo.',
    variables: [
      { name: 'firstName', description: 'Nombre del cliente', sample: 'María' },
      storeNameVar,
    ],
  },
  {
    key: 'email-verification',
    name: 'Verificación de email',
    description: 'Link para confirmar el email de la cuenta.',
    subject: 'Confirmá tu email — {{storeName}}',
    html: `
      <h2>Hola, {{firstName}}</h2>
      <p>Gracias por crear tu cuenta en <strong>{{storeName}}</strong>. Confirmá tu email haciendo clic en el botón:</p>
      <a href="{{verificationUrl}}" style="${BUTTON_STYLE}">Confirmar mi email</a>
      <p>El enlace expira en {{expirationHours}} horas.</p>
      <p style="font-size:12px;color:#747878;">Si no creaste esta cuenta, ignorá este mensaje.</p>
    `,
    text: 'Hola {{firstName}}, confirmá tu email en: {{verificationUrl}} (expira en {{expirationHours}} horas).',
    variables: [
      { name: 'firstName', description: 'Nombre del cliente', sample: 'María' },
      { name: 'verificationUrl', description: 'URL para confirmar el email', sample: 'http://localhost:3000/verify-email?token=abc123' },
      { name: 'expirationHours', description: 'Horas de validez del enlace', sample: '24' },
      storeNameVar,
    ],
  },
  {
    key: 'password-reset',
    name: 'Recuperación de contraseña',
    description: 'Link para restablecer la contraseña. Se envía desde "¿Olvidaste tu contraseña?".',
    subject: 'Restablecé tu contraseña — {{storeName}}',
    html: `
      <h2>Hola, {{firstName}}</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón:</p>
      <a href="{{resetUrl}}" style="${BUTTON_STYLE}">Restablecer contraseña</a>
      <p style="font-size:12px;color:#747878;">El enlace expira en {{expirationMinutes}} minutos. Si no solicitaste este cambio, ignorá este mensaje.</p>
    `,
    text: 'Hola {{firstName}}, restablecé tu contraseña en: {{resetUrl}} (expira en {{expirationMinutes}} minutos).',
    variables: [
      { name: 'firstName', description: 'Nombre del cliente', sample: 'María' },
      { name: 'resetUrl', description: 'URL para restablecer la contraseña', sample: 'http://localhost:3000/reset-password?token=abc123' },
      { name: 'expirationMinutes', description: 'Minutos de validez del enlace', sample: '60' },
      storeNameVar,
    ],
  },
  {
    key: 'newsletter-confirmation',
    name: 'Confirmación de newsletter',
    description: 'Se envía al suscribirse al newsletter.',
    subject: 'Bienvenido al newsletter de {{storeName}}',
    html: `
      <h2>Gracias por suscribirte</h2>
      <p>Recibirás primicias sobre drops exclusivos, colaboraciones y lanzamientos de {{storeName}}.</p>
      <p style="font-size:12px;color:#747878;">Si no solicitaste esta suscripción, podés ignorar este mensaje.</p>
    `,
    text: 'Gracias por suscribirte al newsletter de {{storeName}}. Recibirás primicias sobre drops exclusivos.',
    variables: [storeNameVar],
  },
  {
    key: 'order-created',
    name: 'Orden recibida',
    description: 'Confirmación de que la orden fue creada (checkout iniciado).',
    subject: 'Orden recibida — #{{orderNumber}}',
    html: `
      <h2>Tu orden fue recibida</h2>
      <p>Número de orden: <strong>#{{orderNumber}}</strong></p>
      <p>Total: <strong>{{currencyCode}} {{total}}</strong></p>
      <p>Te avisaremos cuando el pago sea confirmado y la orden pase a producción.</p>
    `,
    text: 'Tu orden #{{orderNumber}} fue recibida. Total: {{currencyCode}} {{total}}.',
    variables: [
      { name: 'orderNumber', description: 'Últimos 6 caracteres del ID de orden', sample: 'A1B2C3' },
      { name: 'total', description: 'Total formateado', sample: '125.000' },
      { name: 'currencyCode', description: 'Código de moneda', sample: 'COP' },
      storeNameVar,
    ],
  },
  {
    key: 'order-status-update',
    name: 'Actualización de estado de orden',
    description: 'Se envía cuando el admin cambia el estado de una orden.',
    subject: 'Actualización de tu orden — #{{orderNumber}}',
    html: `
      <h2>Tu orden cambió de estado</h2>
      <p>Número de orden: <strong>#{{orderNumber}}</strong></p>
      <p>Estado actual: <strong>{{status}}</strong></p>
      {{{trackingBlock}}}
      <p>Podés ver el detalle en tu cuenta.</p>
    `,
    text: 'Tu orden #{{orderNumber}} ahora está en estado {{status}}.',
    variables: [
      { name: 'orderNumber', description: 'Últimos 6 caracteres del ID de orden', sample: 'A1B2C3' },
      { name: 'status', description: 'Estado actual de la orden', sample: 'SHIPPED' },
      { name: 'trackingBlock', description: 'Bloque HTML con info de seguimiento (crudo, puede ir vacío)', sample: '<p>Número de seguimiento: <strong>123456</strong> (Correo)</p>' },
      storeNameVar,
    ],
  },
  {
    key: 'payment-confirmed',
    name: 'Pago confirmado',
    description: 'Confirmación de pago exitoso de la orden.',
    subject: 'Pago confirmado — #{{orderNumber}}',
    html: `
      <h2>Pago confirmado</h2>
      <p>Número de orden: <strong>#{{orderNumber}}</strong></p>
      <p>Total: <strong>{{currencyCode}} {{total}}</strong></p>
      <p>Tu orden ya está en preparación.</p>
    `,
    text: 'Pago confirmado para orden #{{orderNumber}}. Total: {{currencyCode}} {{total}}.',
    variables: [
      { name: 'orderNumber', description: 'Últimos 6 caracteres del ID de orden', sample: 'A1B2C3' },
      { name: 'total', description: 'Total formateado', sample: '125.000' },
      { name: 'currencyCode', description: 'Código de moneda', sample: 'COP' },
      storeNameVar,
    ],
  },
  {
    key: 'custom-design-approved',
    name: 'Diseño personalizado aprobado',
    description: 'Se envía cuando el admin aprueba un diseño personalizado.',
    subject: 'Tu diseño fue aprobado — {{storeName}}',
    html: `
      <h2>Hola, {{firstName}}</h2>
      <p>Tu diseño personalizado basado en <strong>{{templateName}}</strong> fue aprobado.</p>
      <p>Ya podés agregarlo al carrito y continuar con la compra.</p>
      <a href="/personalizar" style="${BUTTON_STYLE}">Ver mis diseños</a>
    `,
    text: 'Hola {{firstName}}, tu diseño basado en {{templateName}} fue aprobado. Ya podés agregarlo al carrito.',
    variables: [
      { name: 'firstName', description: 'Nombre del cliente', sample: 'María' },
      { name: 'templateName', description: 'Nombre de la plantilla de diseño', sample: 'Remera básica' },
      storeNameVar,
    ],
  },
  {
    key: 'custom-design-rejected',
    name: 'Diseño personalizado rechazado',
    description: 'Se envía cuando el admin rechaza un diseño personalizado.',
    subject: 'Tu diseño no fue aprobado — {{storeName}}',
    html: `
      <h2>Hola, {{firstName}}</h2>
      <p>Tu diseño personalizado basado en <strong>{{templateName}}</strong> no fue aprobado.</p>
      <p><strong>Motivo:</strong> {{reason}}</p>
      <p>Podés editar el diseño y volver a enviarlo para revisión.</p>
      <a href="/personalizar" style="${BUTTON_STYLE}">Ver mis diseños</a>
    `,
    text: 'Hola {{firstName}}, tu diseño basado en {{templateName}} no fue aprobado. Motivo: {{reason}}. Podés editarlo y reenviarlo.',
    variables: [
      { name: 'firstName', description: 'Nombre del cliente', sample: 'María' },
      { name: 'templateName', description: 'Nombre de la plantilla de diseño', sample: 'Remera básica' },
      { name: 'reason', description: 'Motivo del rechazo', sample: 'La imagen tiene baja resolución' },
      storeNameVar,
    ],
  },
  {
    key: 'production-status-update',
    name: 'Actualización de producción',
    description: 'Se envía cuando un ítem de la orden avanza en la cola de producción.',
    subject: 'Actualización de producción — #{{orderNumber}}',
    html: `
      <h2>Tu prenda avanzó en producción</h2>
      <p>Número de orden: <strong>#{{orderNumber}}</strong></p>
      <p>Producto: <strong>{{itemName}}</strong></p>
      <p>Estado de producción: <strong>{{status}}</strong></p>
    `,
    text: 'Tu orden #{{orderNumber}} - {{itemName}} ahora está en estado de producción {{status}}.',
    variables: [
      { name: 'orderNumber', description: 'Últimos 6 caracteres del ID de orden', sample: 'A1B2C3' },
      { name: 'itemName', description: 'Nombre del producto', sample: 'Remera oversize negra' },
      { name: 'status', description: 'Estado de producción', sample: 'PRINTING' },
      storeNameVar,
    ],
  },
  {
    key: 'shipment-update',
    name: 'Actualización de envío',
    description: 'Se envía cuando se registra o actualiza un envío.',
    subject: 'Actualización de envío — #{{orderNumber}}',
    html: `
      <h2>Tu orden tiene novedades de envío</h2>
      <p>Número de orden: <strong>#{{orderNumber}}</strong></p>
      <p>Transporte: <strong>{{carrier}}</strong></p>
      <p>Número de seguimiento: <strong>{{trackingNumber}}</strong></p>
      {{{trackingLink}}}
      <p>Estado: <strong>{{status}}</strong></p>
    `,
    text: 'Tu orden #{{orderNumber}} fue enviada por {{carrier}}. Seguimiento: {{trackingNumber}}. Estado: {{status}}.',
    variables: [
      { name: 'orderNumber', description: 'Últimos 6 caracteres del ID de orden', sample: 'A1B2C3' },
      { name: 'carrier', description: 'Transportista', sample: 'Servientrega' },
      { name: 'trackingNumber', description: 'Número de seguimiento', sample: '123456789' },
      { name: 'trackingLink', description: 'Link HTML de rastreo (crudo, puede ir vacío)', sample: '<p><a href="https://example.com/track">Rastrear envío</a></p>' },
      { name: 'status', description: 'Estado del envío', sample: 'IN_TRANSIT' },
      storeNameVar,
    ],
  },
];

export function getDefaultTemplate(key: string): EmailTemplateDefinition | undefined {
  return DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === key);
}
