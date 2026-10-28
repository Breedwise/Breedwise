/* Blessed Beyond Dobermans — shared behavior */
(function () {
  // year stamps
  document.querySelectorAll('[data-yr]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

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
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle(false); });
    });
  }

  // reveal on scroll
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && rv.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 0.07) + 's';
      io.observe(el);
    });
  } else {
    rv.forEach(function (el) { el.classList.add('show'); });
  }

  // inquiry form -> Kennel OS
  var form = document.getElementById('inqForm');
  if (form) {
    var KOS = 'https://jrfdufemonjhafqyacge.supabase.co/functions/v1/kennel-os-api?key=kos_live_2bc2884f7395483d9808a0af954b36ba';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.hp_field && form.hp_field.value) { return; }
      var out = document.getElementById('f-msg-out');
      out.style.color = 'var(--copper-lt)'; out.textContent = '';
      var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var name = g('f-name'), email = g('f-email'), phone = g('f-phone'), msg = g('f-msg');
      var interest = g('f-interest');
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        out.style.color = '#e08a6a'; out.textContent = 'Please add your name and a valid email.'; return;
      }
      var btn = document.getElementById('f-submit');
      btn.disabled = true; btn.textContent = 'Sending...';
      var body = { name: name, email: email, phone: phone, message: msg, source: 'Website' };
      if (interest) { body.message = (interest ? '[Interest: ' + interest + '] ' : '') + msg; }
      fetch(KOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'public' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function () {
          var card = document.getElementById('formCard');
          card.innerHTML = '<div class="done"><div class="ic">✦</div><h3>Thank you, ' +
            name.replace(/[<>&]/g, '') + '.</h3><p>Your inquiry is in. We will be in touch right away, usually within the hour.</p></div>';
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Send Inquiry →';
          out.style.color = '#e08a6a';
          out.textContent = 'Something went wrong. Please call or email us directly.';
        });
    });
  }
})();
