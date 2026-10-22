/**
 * Animación "volar al carrito": clona la imagen del producto y la anima hasta
 * el icono del carrito del header (`[data-cart-target]`), que pulsa al llegar.
 * Reemplaza al aviso/toast de "agregado al carrito".
 */
export function flyToCart(source?: HTMLElement | null, imageUrl?: string) {
  if (typeof window === 'undefined') return;

  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  if (!target) return;

  const targetRect = target.getBoundingClientRect();
  const sourceRect = source?.getBoundingClientRect();
  const size = 72;

  const startX = sourceRect
    ? sourceRect.left + sourceRect.width / 2 - size / 2
    : window.innerWidth / 2 - size / 2;
  const startY = sourceRect
    ? sourceRect.top + sourceRect.height / 2 - size / 2
    : window.innerHeight / 2 - size / 2;
  const endX = targetRect.left + targetRect.width / 2 - 12;
  const endY = targetRect.top + targetRect.height / 2 - 12;

  const node = document.createElement('div');
  node.setAttribute('aria-hidden', 'true');
  node.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${size}px`,
    `height:${size}px`,
    'z-index:600',
    'pointer-events:none',
    'overflow:hidden',
    'border:1px solid #0d0d0d',
    'background:#f6f3f2',
  ].join(';');

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    node.appendChild(img);
  }

  document.body.appendChild(node);

  const midX = startX + (endX - startX) * 0.5;
  const midY = Math.min(startY, endY) - 90;

  const animation = node.animate(
    [
      { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1, offset: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.72)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${endX}px, ${endY}px) scale(0.12)`, opacity: 0.2, offset: 1 },
    ],
    { duration: 760, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
  );

  const cleanup = () => node.remove();
  animation.onfinish = () => {
    cleanup();
    pulseCartTarget(target);
  };
  animation.oncancel = cleanup;
}

function pulseCartTarget(target: HTMLElement) {
  target.classList.remove('nova-cart-pulse');
  // Reflow para poder reiniciar la animación en clics consecutivos.
  void target.offsetWidth;
  target.classList.add('nova-cart-pulse');
  window.setTimeout(() => target.classList.remove('nova-cart-pulse'), 700);
}
