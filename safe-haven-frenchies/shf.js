/* Safe Haven Frenchies — shared behavior */
(function () {
  // year stamps
  document.querySelectorAll('[data-yr]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // nav background on scroll
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', scrollY > 40); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // mobile menu
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobilemenu');
  if (burger && menu) {
    var toggle = function (open) {
      burger.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () { toggle(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
  }

  // reveal on scroll
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && rv.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el, i) { el.style.transitionDelay = (Math.min(i % 4, 3) * 0.07) + 's'; io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('show'); }); }

  // lightbox
  var lb, lbImg, imgs = [], idx = 0;
  function ensure() {
    if (lb) return;
    lb = document.createElement('div'); lb.className = 'lb';
    lb.innerHTML = '<span class="x">&times;</span><span class="nav prev">&#8249;</span><img alt=""><span class="nav next">&#8250;</span>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('img');
    lb.querySelector('.x').onclick = close;
    lb.querySelector('.prev').onclick = function (e) { e.stopPropagation(); go(-1); };
    lb.querySelector('.next').onclick = function (e) { e.stopPropagation(); go(1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1);
    });
  }
  function show() { lbImg.src = imgs[idx]; }
  function go(d) { idx = (idx + d + imgs.length) % imgs.length; show(); }
  function close() { lb.classList.remove('on'); }
  window.shfLightbox = function (list, start) { if (!list || !list.length) return; ensure(); imgs = list; idx = start || 0; show(); lb.classList.add('on'); };

  // inquiry form -> Kennel OS (with BreedWise backend + mailto fallback)
  var form = document.getElementById('inqForm');
  if (form) {
    // TODO: after Austin provisions the Safe Haven kennel, replace the key below with its real kos_live_ key.
    var KOS = 'https://jrfdufemonjhafqyacge.supabase.co/functions/v1/kennel-os-api?key=kos_live_REPLACE_WITH_SAFE_HAVEN_KEY';
    var OPTIN = 'https://xhjdowbnqcsvhtcccuqx.supabase.co/functions/v1/masterclass-optin';
    var OWNER_EMAIL = 'hello@safehavenfrenchies.com'; // TODO: confirm Adam & Kayden's real inbox
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.hp_field && form.hp_field.value) { return; }
      var out = document.getElementById('f-msg-out');
      if (out) { out.style.color = 'var(--gold-dp)'; out.textContent = ''; }
      var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var name = g('f-name'), email = g('f-email'), phone = g('f-phone'), msg = g('f-msg'), interest = g('f-interest');
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (out) { out.style.color = '#b4563f'; out.textContent = 'Please add your name and a valid email.'; } return;
      }
      var btn = document.getElementById('f-submit');
      btn.disabled = true; btn.textContent = 'Sending...';
      var message = (interest ? '[Interest: ' + interest + '] ' : '') + msg;
      var done = function () {
        var card = document.getElementById('formCard');
        if (card) card.innerHTML = '<div class="done"><div class="ic">✦</div><h3>Thank you, ' +
          name.replace(/[<>&]/g, '') + '.</h3><p>Your inquiry is received. We will be in touch soon — usually within a day.</p></div>';
      };
      var toOptin = function () {
        fetch(OPTIN, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': 'public' },
          body: JSON.stringify({ name: name, email: email, phone: phone, source: 'Safe Haven Frenchies Inquiry', message: message, notes: message }) })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r); }).then(done)
          .catch(function () {
            btn.disabled = false; btn.textContent = 'Send Inquiry →';
            if (out) { out.style.color = '#b4563f'; out.textContent = 'Something went wrong — please email us directly.'; }
            window.location.href = 'mailto:' + OWNER_EMAIL + '?subject=' + encodeURIComponent('Puppy inquiry — ' + name) +
              '&body=' + encodeURIComponent(message + '\n\n' + email + ' · ' + phone);
          });
      };
      fetch(KOS, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': 'public' },
        body: JSON.stringify({ name: name, email: email, phone: phone, message: message, source: 'Website' }) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); }).then(done)
        .catch(toOptin);
    });
  }
})();
