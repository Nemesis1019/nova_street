export type SupportedLocale = 'es' | 'en' | 'pt';

export const defaultErrorLocale: SupportedLocale = 'es';

const propertyTranslations: Record<string, Record<SupportedLocale, string>> = {
  name: { es: 'El nombre', en: 'Name', pt: 'Nome' },
  slug: { es: 'El slug', en: 'Slug', pt: 'Slug' },
  description: { es: 'La descripción', en: 'Description', pt: 'Descrição' },
  basePrice: { es: 'El precio base', en: 'Base price', pt: 'Preço base' },
  categoryId: { es: 'La categoría', en: 'Category', pt: 'Categoria' },
  email: { es: 'El email', en: 'Email', pt: 'Email' },
  password: { es: 'La contraseña', en: 'Password', pt: 'Senha' },
  firstName: { es: 'El nombre', en: 'First name', pt: 'Nome' },
  lastName: { es: 'El apellido', en: 'Last name', pt: 'Sobrenome' },
  acceptedTerms: { es: 'Los términos', en: 'Terms', pt: 'Termos' },
  mimeType: { es: 'El tipo de archivo', en: 'File type', pt: 'Tipo de arquivo' },
  size: { es: 'El tamaño', en: 'Size', pt: 'Tamanho' },
  filename: { es: 'El nombre de archivo', en: 'Filename', pt: 'Nome do arquivo' },
  purpose: { es: 'El propósito', en: 'Purpose', pt: 'Propósito' },
};

function translateProperty(property: string, locale: SupportedLocale): string {
  return propertyTranslations[property]?.[locale] ?? property;
}

interface PatternRule {
  pattern: RegExp;
  transform: (property: string, values: string[], locale: SupportedLocale) => string;
}

const spanishPatterns: PatternRule[] = [
  {
    pattern: /^(.+?) should not be empty$/,
    transform: (property) => `${translateProperty(property, 'es')} no debe estar vacío`,
  },
  {
    pattern: /^(.+?) must be a string$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un texto`,
  },
  {
    pattern: /^(.+?) must be an integer$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un número entero`,
  },
  {
    pattern: /^(.+?) must be a boolean value$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un valor booleano`,
  },
  {
    pattern: /^(.+?) must be a UUID$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un UUID válido`,
  },
  {
    pattern: /^(.+?) must be an email$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un correo válido`,
  },
  {
    pattern: /^(.+?) must be longer than or equal to (\d+) characters$/,
    transform: (property, values) =>
      `${translateProperty(property, 'es')} debe tener al menos ${values[0]} caracteres`,
  },
  {
    pattern: /^(.+?) must be shorter than or equal to (\d+) characters$/,
    transform: (property, values) =>
      `${translateProperty(property, 'es')} debe tener como máximo ${values[0]} caracteres`,
  },
  {
    pattern: /^(.+?) must not be less than (\d+)$/,
    transform: (property, values) =>
      `${translateProperty(property, 'es')} no debe ser menor a ${values[0]}`,
  },
  {
    pattern: /^(.+?) must not be greater than (\d+)$/,
    transform: (property, values) =>
      `${translateProperty(property, 'es')} no debe ser mayor a ${values[0]}`,
  },
  {
    pattern: /^(.+?) must be a valid URL slug$/,
    transform: (property) => `${translateProperty(property, 'es')} debe ser un slug URL válido`,
  },
];

const portuguesePatterns: PatternRule[] = [
  {
    pattern: /^(.+?) should not be empty$/,
    transform: (property) => `${translateProperty(property, 'pt')} não deve estar vazio`,
  },
  {
    pattern: /^(.+?) must be a string$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um texto`,
  },
  {
    pattern: /^(.+?) must be an integer$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um número inteiro`,
  },
  {
    pattern: /^(.+?) must be a boolean value$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um valor booleano`,
  },
  {
    pattern: /^(.+?) must be a UUID$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um UUID válido`,
  },
  {
    pattern: /^(.+?) must be an email$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um email válido`,
  },
  {
    pattern: /^(.+?) must be longer than or equal to (\d+) characters$/,
    transform: (property, values) =>
      `${translateProperty(property, 'pt')} deve ter pelo menos ${values[0]} caracteres`,
  },
  {
    pattern: /^(.+?) must be shorter than or equal to (\d+) characters$/,
    transform: (property, values) =>
      `${translateProperty(property, 'pt')} deve ter no máximo ${values[0]} caracteres`,
  },
  {
    pattern: /^(.+?) must not be less than (\d+)$/,
    transform: (property, values) =>
      `${translateProperty(property, 'pt')} não deve ser menor que ${values[0]}`,
  },
  {
    pattern: /^(.+?) must not be greater than (\d+)$/,
    transform: (property, values) =>
      `${translateProperty(property, 'pt')} não deve ser maior que ${values[0]}`,
  },
  {
    pattern: /^(.+?) must be a valid URL slug$/,
    transform: (property) => `${translateProperty(property, 'pt')} deve ser um slug URL válido`,
  },
];

function applyPatternRules(message: string, locale: SupportedLocale): string | null {
  const rules = locale === 'pt' ? portuguesePatterns : spanishPatterns;
  for (const rule of rules) {
    const match = rule.pattern.exec(message);
    if (match) {
      const property = match[1];
      const values = match.slice(2);
      return rule.transform(property, values, locale);
    }
  }
  return null;
}

export const errorTranslations: Record<
  string,
  Partial<Record<SupportedLocale, string>>
> = {
  // Business / service exceptions
  "Assigned user does not exist": {
    es: "El usuario asignado no existe",
    pt: "O usuário atribuído não existe",
  },
  "Cannot cancel a refunded or delivered order": {
    es: "No se puede cancelar una orden reembolsada o entregada",
    pt: "Não é possível cancelar um pedido reembolsado ou entregue",
  },
  "Cannot delete shipping option used by orders": {
    es: "No se puede eliminar una opción de envío usada en órdenes",
    pt: "Não é possível excluir opção de envio usada em pedidos",
  },
  "Cart is empty": {
    es: "El carrito está vacío",
    pt: "O carrinho está vazio",
  },
  "categoryId is required when appliesTo is CATEGORY": {
    es: "La categoría es obligatoria cuando el cupón aplica por categoría",
    pt: "A categoria é obrigatória quando o cupom aplica por categoria",
  },
  "Coupon code already exists": {
    es: "Ya existe un cupón con ese código",
    pt: "Já existe um cupom com esse código",
  },
  "Coupon does not apply to any item in this order": {
    es: "El cupón no aplica a ningún producto de esta orden",
    pt: "O cupom não se aplica a nenhum item deste pedido",
  },
  "Coupon is not valid at this time": {
    es: "El cupón no es válido en este momento",
    pt: "O cupom não é válido neste momento",
  },
  "Coupon is only valid for first purchase": {
    es: "El cupón solo es válido para la primera compra",
    pt: "O cupom é válido apenas para a primeira compra",
  },
  "Coupon usage limit reached": {
    es: "Se alcanzó el límite de usos del cupón",
    pt: "Limite de uso do cupom atingido",
  },
  "Coupon usage limit reached for this user": {
    es: "Se alcanzó el límite de usos del cupón para este usuario",
    pt: "Limite de uso do cupom atingido para este usuário",
  },
  "Custom design not found": {
    es: "Diseño personalizado no encontrado",
    pt: "Design personalizado não encontrado",
  },
  "customDesignId is required for custom items": {
    es: "El diseño personalizado es obligatorio para ítems personalizados",
    pt: "O design personalizado é obrigatório para itens personalizados",
  },
  "Email already registered. Please log in.": {
    es: "El email ya está registrado. Por favor, iniciá sesión.",
    pt: "O email já está registrado. Por favor, faça login.",
  },
  "Empty CSV file": {
    es: "El archivo CSV está vacío",
    pt: "O arquivo CSV está vazio",
  },
  "Insufficient stock": {
    es: "Stock insuficiente",
    pt: "Estoque insuficiente",
  },
  "Insufficient stock for this variant": {
    es: "Stock insuficiente para esta variante",
    pt: "Estoque insuficiente para esta variante",
  },
  "Invalid cart item type": {
    es: "Tipo de ítem de carrito inválido",
    pt: "Tipo de item de carrinho inválido",
  },
  "Invalid coupon": {
    es: "Cupón inválido",
    pt: "Cupom inválido",
  },
  "Invalid shipping address": {
    es: "Dirección de envío inválida",
    pt: "Endereço de envio inválido",
  },
  "Invalid shipping or billing address": {
    es: "Dirección de envío o facturación inválida",
    pt: "Endereço de envio ou faturamento inválido",
  },
  "Invalid signature": {
    es: "Firma inválida",
    pt: "Assinatura inválida",
  },
  "Inventory record not found for tracked variant": {
    es: "No se encontró inventario para la variante con seguimiento",
    pt: "Registro de estoque não encontrado para variante rastreada",
  },
  "New status must be different from current status": {
    es: "El nuevo estado debe ser distinto al actual",
    pt: "O novo status deve ser diferente do status atual",
  },
  "No active reservation to commit": {
    es: "No hay reserva activa para confirmar",
    pt: "Nenhuma reserva ativa para confirmar",
  },
  "One or more images are already attached to another review": {
    es: "Una o más imágenes ya están adjuntas a otra reseña",
    pt: "Uma ou mais imagens já estão anexadas a outra avaliação",
  },
  "One or more images are invalid or do not belong to you": {
    es: "Una o más imágenes son inválidas o no te pertenecen",
    pt: "Uma ou mais imagens são inválidas ou não pertencem a você",
  },
  "One or more product variants are invalid": {
    es: "Una o más variantes de producto son inválidas",
    pt: "Uma ou mais variantes de produto são inválidas",
  },
  "Only draft designs can be edited": {
    es: "Solo se pueden editar diseños en borrador",
    pt: "Apenas designs em rascunho podem ser editados",
  },
  "Only draft designs can be submitted": {
    es: "Solo se pueden enviar diseños en borrador",
    pt: "Apenas designs em rascunho podem ser enviados",
  },
  "Order is already cancelled": {
    es: "La orden ya está cancelada",
    pt: "O pedido já está cancelado",
  },
  "Order is already refunded": {
    es: "La orden ya está reembolsada",
    pt: "O pedido já está reembolsado",
  },
  "Order is not pending payment": {
    es: "La orden no está pendiente de pago",
    pt: "O pedido não está pendente de pagamento",
  },
  "Order must be ready to ship or shipped before creating a shipment": {
    es: "La orden debe estar lista para enviar o enviada antes de crear un envío",
    pt: "O pedido deve estar pronto para envio ou enviado antes de criar uma remessa",
  },
  "Product variant is not available": {
    es: "La variante de producto no está disponible",
    pt: "A variante de produto não está disponível",
  },
  "productId is required when appliesTo is PRODUCT": {
    es: "El producto es obligatorio cuando el cupón aplica por producto",
    pt: "O produto é obrigatório quando o cupom aplica por produto",
  },
  "productVariantId is required for standard items": {
    es: "La variante es obligatoria para ítems estándar",
    pt: "A variante é obrigatória para itens padrão",
  },
  "Rejection reason is required": {
    es: "El motivo de rechazo es obligatorio",
    pt: "O motivo da rejeição é obrigatório",
  },
  "Stripe is not configured": {
    es: "Stripe no está configurado",
    pt: "Stripe não está configurado",
  },
  "Variant is not tracked": {
    es: "La variante no tiene seguimiento de stock",
    pt: "A variante não tem rastreamento de estoque",
  },
  "Variant not found": {
    es: "Variante no encontrada",
    pt: "Variante não encontrada",
  },
  "You already reviewed this product": {
    es: "Ya reseñaste este producto",
    pt: "Você já avaliou este produto",
  },
  "You can only review products from paid orders": {
    es: "Solo podés reseñar productos de órdenes pagadas",
    pt: "Você só pode avaliar produtos de pedidos pagos",
  },
  "El email ya está suscrito al newsletter.": {
    es: "El email ya está suscrito al newsletter.",
    pt: "O email já está inscrito na newsletter.",
  },
  "Email already registered": {
    es: "El email ya está registrado",
    pt: "O email já está registrado",
  },
  "CUSTOMER role not found": {
    es: "No se encontró el rol de cliente",
    pt: "Papel de CLIENTE não encontrado",
  },
  "DATABASE_URL is not configured": {
    es: "DATABASE_URL no está configurada",
    pt: "DATABASE_URL não está configurada",
  },
  "R2 storage is not configured": {
    es: "El almacenamiento R2 no está configurado",
    pt: "O armazenamento R2 não está configurado",
  },
  "Authentication required": {
    es: "Autenticación requerida",
    pt: "Autenticação necessária",
  },
  "Email not verified": {
    es: "Email no verificado",
    pt: "Email não verificado",
  },
  "You do not own this design": {
    es: "No sos el dueño de este diseño",
    pt: "Você não é o dono deste design",
  },
  "Address not found": {
    es: "Dirección no encontrada",
    pt: "Endereço não encontrado",
  },
  "Assignee user not found": {
    es: "Usuario asignado no encontrado",
    pt: "Usuário atribuído não encontrado",
  },
  "Cannot delete the default currency": {
    es: "No se puede eliminar la moneda por defecto",
    pt: "Não é possível excluir a moeda padrão",
  },
  "Cart item not found": {
    es: "Ítem del carrito no encontrado",
    pt: "Item do carrinho não encontrado",
  },
  "Category not found": {
    es: "Categoría no encontrada",
    pt: "Categoria não encontrada",
  },
  "Coupon not found": {
    es: "Cupón no encontrado",
    pt: "Cupom não encontrado",
  },
  "Currency not found": {
    es: "Moneda no encontrada",
    pt: "Moeda não encontrada",
  },
  "Design template not found": {
    es: "Plantilla de diseño no encontrada",
    pt: "Template de design não encontrado",
  },
  "Image not found": {
    es: "Imagen no encontrada",
    pt: "Imagem não encontrada",
  },
  "Invalid filename": {
    es: "Nombre de archivo inválido",
    pt: "Nome de arquivo inválido",
  },
  "One or more image ids do not belong to this product": {
    es: "Una o más imágenes no pertenecen a este producto",
    pt: "Um ou mais ids de imagem não pertencem a este produto",
  },
  "Order not found": {
    es: "Orden no encontrada",
    pt: "Pedido não encontrado",
  },
  "Page not found": {
    es: "Página no encontrada",
    pt: "Página não encontrada",
  },
  "Product not found": {
    es: "Producto no encontrado",
    pt: "Produto não encontrado",
  },
  "Product variant not found": {
    es: "Variante de producto no encontrada",
    pt: "Variante de produto não encontrada",
  },
  "Production item not found": {
    es: "Ítem de producción no encontrado",
    pt: "Item de produção não encontrado",
  },
  "Review not found": {
    es: "Reseña no encontrada",
    pt: "Avaliação não encontrada",
  },
  "Role name already exists": {
    es: "Ya existe un rol con ese nombre",
    pt: "Já existe um papel com esse nome",
  },
  "Role not found": {
    es: "Rol no encontrado",
    pt: "Papel não encontrado",
  },
  "Shipment not found": {
    es: "Envío no encontrado",
    pt: "Remessa não encontrada",
  },
  "Shipping option not found": {
    es: "Opción de envío no encontrada",
    pt: "Opção de envio não encontrada",
  },
  "User not found": {
    es: "Usuario no encontrado",
    pt: "Usuário não encontrado",
  },
  "Wishlist item not found": {
    es: "Ítem de favoritos no encontrado",
    pt: "Item de favoritos não encontrado",
  },
  "Account suspended": {
    es: "Cuenta suspendida",
    pt: "Conta suspensa",
  },
  "Current password is incorrect": {
    es: "La contraseña actual es incorrecta",
    pt: "A senha atual está incorreta",
  },
  "Invalid credentials": {
    es: "Credenciales inválidas",
    pt: "Credenciais inválidas",
  },
  "Invalid or expired verification code": {
    es: "Código de verificación inválido o vencido",
    pt: "Código de verificação inválido ou expirado",
  },
  "Invalid refresh token": {
    es: "Token de refresco inválido",
    pt: "Token de refresh inválido",
  },
  "Invalid token": {
    es: "Token inválido",
    pt: "Token inválido",
  },
  "Missing token": {
    es: "Falta el token",
    pt: "Falta o token",
  },

  // Custom validation messages
  "Invalid basePrice": {
    es: "Precio base inválido",
    pt: "Preço base inválido",
  },
  "Missing categoryId or categoryName": {
    es: "Falta el id o nombre de categoría",
    pt: "Falta o id ou nome da categoria",
  },
  "Missing name": {
    es: "Falta el nombre",
    pt: "Falta o nome",
  },
  "Password must contain at least one letter and one number": {
    es: "La contraseña debe contener al menos una letra y un número",
    pt: "A senha deve conter pelo menos uma letra e um número",
  },
  "slug must be a valid URL slug": {
    es: "El slug debe ser un slug URL válido",
    pt: "O slug deve ser um slug URL válido",
  },
  "slug must be lowercase letters, numbers and hyphens only": {
    es: "El slug solo puede contener letras minúsculas, números y guiones",
    pt: "O slug deve conter apenas letras minúsculas, números e hífens",
  },
  "primaryColor must be a valid CSS color": {
    es: "El color primario debe ser un color CSS válido",
    pt: "A cor primária deve ser uma cor CSS válida",
  },
  "secondaryColor must be a valid CSS color": {
    es: "El color secundario debe ser un color CSS válido",
    pt: "A cor secundária deve ser uma cor CSS válida",
  },
  "backgroundColor must be a valid CSS color": {
    es: "El color de fondo debe ser un color CSS válido",
    pt: "A cor de fundo deve ser uma cor CSS válida",
  },
  "textColor must be a valid CSS color": {
    es: "El color de texto debe ser un color CSS válido",
    pt: "A cor do texto deve ser uma cor CSS válida",
  },
  "surfaceColor must be a valid CSS color": {
    es: "El color de superficie debe ser un color CSS válido",
    pt: "A cor da superfície deve ser uma cor CSS válida",
  },
  "surfaceMutedColor must be a valid CSS color": {
    es: "El color de superficie silenciado debe ser un color CSS válido",
    pt: "A cor da superfície silenciada deve ser uma cor CSS válida",
  },
  "borderColor must be a valid CSS color": {
    es: "El color de borde debe ser un color CSS válido",
    pt: "A cor da borda deve ser uma cor CSS válida",
  },
  "errorColor must be a valid CSS color": {
    es: "El color de error debe ser un color CSS válido",
    pt: "A cor de erro deve ser uma cor CSS válida",
  },
  "successColor must be a valid CSS color": {
    es: "El color de éxito debe ser un color CSS válido",
    pt: "A cor de sucesso deve ser uma cor CSS válida",
  },
  "warningColor must be a valid CSS color": {
    es: "El color de advertencia debe ser un color CSS válido",
    pt: "A cor de aviso deve ser uma cor CSS válida",
  },
  "darkBackgroundColor must be a valid CSS color": {
    es: "El color de fondo oscuro debe ser un color CSS válido",
    pt: "A cor de fundo escuro deve ser uma cor CSS válida",
  },
  "darkTextColor must be a valid CSS color": {
    es: "El color de texto oscuro debe ser un color CSS válido",
    pt: "A cor do texto escuro deve ser uma cor CSS válida",
  },

  // Common class-validator default messages
  "email must be an email": {
    es: "El email debe ser una dirección de correo válida",
    pt: "O email deve ser um endereço válido",
  },
  "email should not be empty": {
    es: "El email no debe estar vacío",
    pt: "O email não deve estar vazio",
  },
  "password must be longer than or equal to 8 characters": {
    es: "La contraseña debe tener al menos 8 caracteres",
    pt: "A senha deve ter pelo menos 8 caracteres",
  },
  "password must be shorter than or equal to 100 characters": {
    es: "La contraseña debe tener como máximo 100 caracteres",
    pt: "A senha deve ter no máximo 100 caracteres",
  },
  "firstName should not be empty": {
    es: "El nombre no debe estar vacío",
    pt: "O nome não deve estar vazio",
  },
  "firstName must be shorter than or equal to 100 characters": {
    es: "El nombre debe tener como máximo 100 caracteres",
    pt: "O nome deve ter no máximo 100 caracteres",
  },
  "lastName should not be empty": {
    es: "El apellido no debe estar vacío",
    pt: "O sobrenome não deve estar vazio",
  },
  "lastName must be shorter than or equal to 100 characters": {
    es: "El apellido debe tener como máximo 100 caracteres",
    pt: "O sobrenome deve ter no máximo 100 caracteres",
  },
  "acceptedTerms should not be empty": {
    es: "Debes aceptar los términos",
    pt: "Você deve aceitar os termos",
  },
  "name should not be empty": {
    es: "El nombre no debe estar vacío",
    pt: "O nome não deve estar vazio",
  },
  "slug should not be empty": {
    es: "El slug no debe estar vacío",
    pt: "O slug não deve estar vazio",
  },
};

export function translateErrorMessage(
  message: string,
  locale: string,
): string {
  const supported = (locale?.split(',')[0]?.split('-')[0] || defaultErrorLocale) as SupportedLocale;

  const translations = errorTranslations[message];
  if (translations) {
    return translations[supported] ?? translations.en ?? message;
  }

  if (supported === 'en') {
    return message;
  }

  const patternMatch = applyPatternRules(message, supported);
  if (patternMatch) {
    return patternMatch;
  }

  return message;
}
