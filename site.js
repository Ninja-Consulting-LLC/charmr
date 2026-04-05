(function () {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  var header = document.getElementById('site-header');
  if (header) {
    function onScroll() {
      header.classList.toggle('site-header--scrolled', window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.getElementById('menu-toggle');
  var panel = document.getElementById('nav-mobile');
  if (toggle && panel) {
    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(!panel.classList.contains('is-open'));
    });

    panel.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  var reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();
