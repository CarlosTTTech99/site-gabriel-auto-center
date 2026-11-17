(function () {
  'use strict';
  var WA = '5515998243630';
  var root = document.documentElement;
  var motion = root.classList.contains('motion');

  // Links do WhatsApp com mensagem pronta (data-wa)
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(a.getAttribute('data-wa'));
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Topo sólido depois de rolar
  var topo = document.getElementById('topo');
  var onScroll = function () { topo.classList.toggle('is-solid', window.scrollY > 40); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Slide da hero
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.hero__dots button'));
  var DUR = 6500, cur = 0, timer = null;
  root.style.setProperty('--dur', DUR / 1000 + 's');
  function go(i) {
    slides[cur].classList.remove('is-on');
    dots[cur].setAttribute('aria-selected', 'false');
    cur = (i + slides.length) % slides.length;
    var img = slides[cur].querySelector('img');
    if (img.loading === 'lazy') img.loading = 'eager';
    // reinicia a animação da foto e da barra
    slides[cur].classList.add('is-on');
    dots[cur].setAttribute('aria-selected', 'true');
    if (motion) {
      [img, dots[cur].querySelector('i')].forEach(function (el) {
        el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      });
    }
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (!motion || document.hidden) return;
    timer = setTimeout(function () { go(cur + 1); }, DUR);
  }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
  // pré-carrega as próximas fotos depois do load
  window.addEventListener('load', function () {
    slides.forEach(function (s) { var im = s.querySelector('img'); im.loading = 'eager'; });
  });
  document.addEventListener('visibilitychange', schedule);
  // arrastar no celular troca a foto
  var hs = document.querySelector('.hero__slides'), sx = null;
  hs.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  hs.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
  });
  schedule();

  // Cards de serviços: setas + barra de progresso
  var cards = document.querySelector('.cards');
  var bar = document.querySelector('.cards__bar i');
  function upd() {
    var max = cards.scrollWidth - cards.clientWidth;
    var vis = cards.clientWidth / cards.scrollWidth;
    var p = max > 0 ? cards.scrollLeft / max : 0;
    bar.style.width = (vis * 100) + '%';
    bar.style.transform = 'translateX(' + (p * (1 / vis - 1) * 100) + '%)';
  }
  cards.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  upd();
  document.querySelectorAll('.cards__nav .circ').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = cards.querySelector('.card');
      var step = card.getBoundingClientRect().width + 18;
      cards.scrollBy({ left: step * Number(b.dataset.dir), behavior: motion ? 'smooth' : 'auto' });
    });
  });

  // Revelar ao rolar, com escalonamento por grupo
  if (motion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) {
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 6) * 0.07 + 's');
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();
})();
