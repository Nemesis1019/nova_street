export type SidebarBadge = 'orders' | 'production' | 'reviews' | 'designs';

export interface AdminNavItem {
  href: string;
  /** Etiqueta por defecto (diseño Stitch, español) */
  label: string;
  /** Clave i18n opcional (sidebar.items.*) */
  labelKey?: string;
  icon: string;
  badge?: SidebarBadge;
}

export interface AdminNavGroup {
  title: string;
  titleKey?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'Principal',
    titleKey: 'sidebar.groups.main',
    items: [{ href: '/dashboard', label: 'Panel general', labelKey: 'sidebar.items.dashboard', icon: 'grid_view' }],
  },
  {
    title: 'Catálogo de Productos',
    titleKey: 'sidebar.groups.catalog',
    items: [
      { href: '/products', label: 'Productos', labelKey: 'sidebar.items.products', icon: 'inventory_2' },
      { href: '/categories', label: 'Categorías', labelKey: 'sidebar.items.categories', icon: 'category' },
      { href: '/inventory', label: 'Stock & Inventario', labelKey: 'sidebar.items.inventory', icon: 'warehouse' },
      {
        href: '/custom-designs',
        label: 'Diseños personalizados',
        labelKey: 'sidebar.items.designs',
        icon: 'palette',
        badge: 'designs',
      },
    ],
  },
  {
    title: 'Ventas & Operaciones',
    titleKey: 'sidebar.groups.sales',
    items: [
      { href: '/orders', label: 'Órdenes', labelKey: 'sidebar.items.orders', icon: 'receipt_long', badge: 'orders' },
      {
        href: '/production',
        label: 'Cola de producción',
        labelKey: 'sidebar.items.production',
        icon: 'precision_manufacturing',
        badge: 'production',
      },
      { href: '/shipping-options', label: 'Envíos', labelKey: 'sidebar.items.shipping', icon: 'local_shipping' },
      { href: '/refunds', label: 'Reembolsos', labelKey: 'sidebar.items.refunds', icon: 'assignment_return' },
      { href: '/coupons', label: 'Cupones de descuento', labelKey: 'sidebar.items.coupons', icon: 'confirmation_number' },
    ],
  },
  {
    title: 'Clientes & Comunidad',
    titleKey: 'sidebar.groups.customers',
    items: [
      { href: '/users', label: 'Usuarios & Clientes', labelKey: 'sidebar.items.users', icon: 'group' },
      { href: '/reviews', label: 'Reseñas', labelKey: 'sidebar.items.reviews', icon: 'star', badge: 'reviews' },
      { href: '/roles', label: 'Roles & Permisos', labelKey: 'sidebar.items.roles', icon: 'verified_user' },
    ],
  },
  {
    title: 'Storefront & Contenido',
    titleKey: 'sidebar.groups.storefront',
    items: [
      { href: '/templates', label: 'Plantillas storefront', labelKey: 'sidebar.items.templates', icon: 'dashboard_customize' },
      { href: '/pages', label: 'Páginas estáticas', labelKey: 'sidebar.items.pages', icon: 'article' },
      { href: '/email-templates', label: 'Plantillas de email', labelKey: 'sidebar.items.emails', icon: 'mail' },
      { href: '/redirects', label: 'Redirects', labelKey: 'sidebar.items.redirects', icon: 'alt_route' },
    ],
  },
  {
    title: 'Configuración',
    titleKey: 'sidebar.groups.settings',
    items: [
      { href: '/store-config', label: 'Configuración de la tienda', labelKey: 'sidebar.items.storeConfig', icon: 'settings' },
      { href: '/currencies', label: 'Monedas', labelKey: 'sidebar.items.currencies', icon: 'paid' },
      { href: '/security', label: 'Seguridad', labelKey: 'sidebar.items.security', icon: 'shield_lock' },
      { href: '/audit-logs', label: 'Auditoría de cambios', labelKey: 'sidebar.items.audit', icon: 'history' },
      { href: '/export', label: 'Exportaciones', labelKey: 'sidebar.items.export', icon: 'download' },
    ],
  },
  {
    // Solo visible para la cuenta de plataforma (SUPER_ADMIN del tenant por defecto).
    title: 'Plataforma',
    titleKey: 'sidebar.groups.platform',
    items: [{ href: '/clients', label: 'Clientes', labelKey: 'sidebar.items.clients', icon: 'dns' }],
  },
];
