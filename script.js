'use strict';
// A phone-link click expresses intent; it does not confirm a completed call.
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="tel:"]');
  if (!link || typeof window.gtag !== 'function') return;
  const location = link.closest('.header') ? 'header'
    : link.classList.contains('mobile-call') ? 'mobile'
    : link.closest('footer') ? 'footer' : 'content';
  window.gtag('event', 'phone_click', {
    send_to: 'G-V1LNWC9XXD',
    contact_method: 'phone',
    link_location: location
  });
});
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav');
function closeMenu() {
  menu?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Открыть меню');
}
menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.classList.contains('open')) { closeMenu(); menuButton.focus(); }
});
document.addEventListener('click', event => {
  if (menu?.classList.contains('open') && !event.target.closest('.header')) closeMenu();
});
matchMedia('(min-width: 851px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
const areaInput = document.querySelector('#area');
function updateObject() {
  if (!areaInput) return;
  const area = Number(areaInput.value);
  const type = document.querySelector('input[name="space"]:checked')?.value === 'flat' ? 'Квартира' : 'Частный дом';
  document.querySelector('#area-output').value = area;
  document.querySelector('#estimate-summary').textContent = `${type}, ${area} м². Стоимость согласуем после замера.`;
  const fill = (area - Number(areaInput.min)) / (Number(areaInput.max) - Number(areaInput.min)) * 100;
  areaInput.style.background = `linear-gradient(90deg,#d8594e 0%,#d8594e ${fill}%,#777478 ${fill}%)`;
}
areaInput?.addEventListener('input', updateObject);
document.querySelectorAll('input[name="space"]').forEach(input => input.addEventListener('change', updateObject));
updateObject();
const progress = document.querySelector('.scroll-progress');
let pendingScroll = false;
function updateScroll() {
  if (progress) progress.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
  pendingScroll = false;
}
addEventListener('scroll', () => { if (!pendingScroll) { pendingScroll = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();
if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  document.querySelectorAll('.benefit, .extras-grid > .glass').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--px', `${event.clientX - rect.left}px`);
      card.style.setProperty('--py', `${event.clientY - rect.top}px`);
    });
  });
}
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), { threshold: .08, rootMargin: '0px 0px 70px 0px' });
  document.querySelectorAll('.intro-head, .metrics, .benefit, .feature-content, .steps-list, .estimate-panel, .service-card').forEach(target => { target.classList.add('reveal'); observer.observe(target); });
  document.body.classList.add('js');
}
