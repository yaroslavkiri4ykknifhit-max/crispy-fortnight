const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav');

menuButton.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});

menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
}));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('open')) {
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.focus();
  }
});

const areaInput = document.querySelector('#area');
const areaOutput = document.querySelector('#area-output');
const estimateResult = document.querySelector('#estimate-result');
const estimateRate = document.querySelector('#estimate-rate');

function updateEstimate() {
  const area = Number(areaInput.value);
  const flat = document.querySelector('input[name="space"]:checked').value === 'flat';
  let total;
  let detail;

  if (flat) {
    if (area <= 10) { total = 600; detail = 'до 10 м² / фиксированная цена от 600 руб.'; }
    else if (area <= 20) { total = 700; detail = '10–20 м² / фиксированная цена от 700 руб.'; }
    else if (area <= 50) { total = area * 32; detail = `${area} м² / от 32 руб/м²`; }
    else { total = area * 30; detail = `${area} м² / от 30 руб/м²`; }
  } else {
    if (area <= 30) { total = 500; detail = 'до 30 м² / фиксированная цена от 500 руб.'; }
    else if (area <= 60) { total = area * 18; detail = `${area} м² / от 18 руб/м²`; }
    else if (area <= 100) { total = area * 17; detail = `${area} м² / от 17 руб/м²`; }
    else { total = area * 16; detail = `${area} м² / от 16 руб/м²`; }
  }

  areaOutput.value = area;
  estimateResult.innerHTML = `от ${total.toLocaleString('ru-RU')} <small>руб.</small>`;
  estimateRate.textContent = detail;
  areaInput.style.background = `linear-gradient(90deg,#d8594e 0%,#d8594e ${((area - 5) / 195) * 100}%,#777478 ${((area - 5) / 195) * 100}%)`;
}
areaInput.addEventListener('input', updateEstimate);
document.querySelectorAll('input[name="space"]').forEach(input => input.addEventListener('change', updateEstimate));
updateEstimate();

const progress = document.querySelector('.scroll-progress');
let pendingScroll = false;
function updateScroll() {
  progress.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
  pendingScroll = false;
}
addEventListener('scroll', () => {
  if (!pendingScroll) { pendingScroll = true; requestAnimationFrame(updateScroll); }
}, { passive: true });
updateScroll();

document.querySelectorAll('.benefit, .price-card, .extras-grid > .glass').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--px', `${event.clientX - rect.left}px`);
    card.style.setProperty('--py', `${event.clientY - rect.top}px`);
  });
});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const targets = document.querySelectorAll('.intro-head, .metrics, .benefit, .feature-content, .steps-heading, .steps-list, .estimate-copy, .estimate-panel, .pricing-heading, .price-card, .extras-layout, .faq-lead, .contact-inner');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
    });
  }, { threshold: .08, rootMargin: '0px 0px 70px 0px' });
  targets.forEach(target => { target.classList.add('reveal'); observer.observe(target); });
  document.body.classList.add('js');
}
