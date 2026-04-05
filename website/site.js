(function () {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  var STORAGE_KEY = 'charmr_site_lang';
  var currentLang = 'en';

  var MESSAGES = {
    en: {
      title: 'Charmr — AI Dating Coach for Better Dating Texts',
      metaDescription:
        'Charmr is an AI dating coach for iOS. It helps you write better messages, stop overthinking, and stay calm while you date.',
      metaOgDescription:
        'More than a message generator. Charmr helps you text with confidence, stay true to yourself, and worry less about each outcome.',
      metaTwitterDescription: 'Text with confidence, stay calm, and stop overthinking every reply.',
      skipToMain: 'Skip to main content',
      brandHomeAria: 'Charmr home',
      navPrimaryAria: 'Primary navigation',
      footerNavAria: 'Footer',
      langGroupAria: 'Choose language',
      langEnAria: 'English',
      langEsAria: 'Spanish',
      navHow: 'How it works',
      navWhy: 'Why it helps',
      navTools: 'Tools',
      navFaq: 'FAQ',
      navContact: 'Contact',
      heroEyebrow: 'AI dating coach · iOS',
      heroTitle: 'Stop overthinking every text',
      heroLead:
        'Charmr helps you write messages that sound like you. It also helps you stay calm when you are waiting, guessing, or tempted to spiral.',
      appStoreAlt: 'Download Charmr on the App Store',
      heroWhyLink: 'Why this works →',
      heroOutcomesAria: 'Core outcomes',
      heroPoint1: 'Write clear replies faster',
      heroPoint2: 'Feel less stress between messages',
      heroPoint3: 'Stay true to your voice',
      heroNote: 'iOS only. Every suggestion is optional and editable.',
      phoneChip: 'Coaching mode',
      trustTitle: 'Works with conversations from',
      trustMore: '+ more',
      coachingTitle: 'More than a text generator',
      coachingLead:
        'Most people do not struggle with words. They struggle with pressure, doubt, and overthinking. Charmr is built for that.',
      compareLeftTitle: 'Most text tools',
      compareLeft1: 'Focus only on the next line',
      compareLeft2: 'Push "perfect" replies',
      compareLeft3: 'Can make you second-guess yourself more',
      compareRightTitle: 'Charmr coaching approach',
      compareRight1: 'Helps with what to say and why',
      compareRight2: 'Helps you pause before reactive texts',
      compareRight3: 'Builds confidence over time, in your own voice',
      howTitle: 'How it works',
      howLead: 'Simple steps you can use in real conversations.',
      step1Title: 'Share the context',
      step1Body: 'Upload a screenshot so Charmr can read the chat tone, timing, and flow.',
      step2Title: 'Get coached options',
      step2Body: 'Get message options that match your style and help you stay calm and clear.',
      step3Title: 'Edit, send, or skip',
      step3Body: 'Choose what fits, edit it, or skip it. You stay in control every time.',
      toolsTitle: 'Tools you can use right away',
      toolsLead: 'Made for real dating app chats, not generic text templates.',
      tool1Title: 'Guidance for your situation',
      tool1Body: 'From first messages to follow-ups, get help that fits the moment.',
      tool2Title: 'Voice-preserving rewrites',
      tool2Body: 'Improve tone and clarity while keeping your own style.',
      tool3Title: 'In-the-moment iOS access',
      tool3Body: 'Use screenshots and the optional keyboard when you need help fast.',
      galleryTitle: 'Inside the app',
      galleryLead: 'See the full workflow: home, coach chat, keyboard, and guided replies.',
      galleryAltHome: 'Charmr home screen showing coaching actions and match context',
      galleryAltChat: 'Charmr coaching chat helping with messaging strategy',
      galleryAltKeyboard: 'Charmr custom keyboard for in-the-moment support',
      galleryAltReplies: 'Reply modal with guided options for confident sending',
      galleryCapHome: 'Home',
      galleryCapChat: 'Coach chat',
      galleryCapKeyboard: 'Keyboard',
      galleryCapReplies: 'Guided replies',
      momentsTitle: 'Best times to open Charmr',
      momentsLead: 'Use it in moments that usually cause stress.',
      moment1Title: 'When you are stuck on a reply',
      moment1Body: 'Get unstuck with clear options that fit your tone.',
      moment2Title: 'When you are spiraling while waiting',
      moment2Body: 'Reset your mindset so one slow reply does not ruin your day.',
      moment3Title: 'When you want to sound like yourself',
      moment3Body: 'Rewrite drafts without losing your personality.',
      faqTitle: 'FAQ',
      faqLead: 'Quick answers before you download.',
      faq1Q: 'Is Charmr only a message generator?',
      faq1A: 'No. It helps with words, but it also helps with mindset, timing, and confidence.',
      faq2Q: 'Is this therapy?',
      faq2A: 'No. Charmr is a dating communication coach, not a mental health service.',
      faq3Q: 'Do you read my dating apps directly?',
      faq3A: 'No. Charmr only uses what you choose to share, like screenshots you select.',
      faq4Q: 'Will this make me sound fake?',
      faq4A: 'It should do the opposite. You can edit every line so your messages still sound like you.',
      faq5Q: 'Is Charmr free?',
      faq5A:
        'You can download and try the app for free. Paid plans and message packs may apply for heavier use. Check the App Store page for current pricing.',
      contactTitle: 'Contact',
      contactLead: 'Questions, feedback, or partnership ideas? Send us a message.',
      contactNameLabel: 'Name',
      contactEmailLabel: 'Email',
      contactMessageLabel: 'Message',
      contactSendButton: 'Send message',
      footerPrivacy: 'Privacy Policy',
      footerTerms: 'Terms of Service',
      footerAppStore: 'App Store',
      footerTagline: 'Text with clarity. Date with confidence.',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
    },
    es: {
      title: 'Charmr — Coach de Citas con IA para Mensajes Mejores',
      metaDescription:
        'Charmr es un coach de citas con IA para iOS. Te ayuda a escribir mejores mensajes, dejar de sobrepensar y mantener la calma.',
      metaOgDescription:
        'Mucho más que un generador de mensajes. Charmr te ayuda a escribir con confianza, ser tú mismo y preocuparte menos por cada resultado.',
      metaTwitterDescription: 'Escribe con confianza, mantén la calma y deja de sobrepensar cada respuesta.',
      skipToMain: 'Saltar al contenido principal',
      brandHomeAria: 'Inicio de Charmr',
      navPrimaryAria: 'Navegación principal',
      footerNavAria: 'Pie de página',
      langGroupAria: 'Elegir idioma',
      langEnAria: 'Inglés',
      langEsAria: 'Español',
      navHow: 'Cómo funciona',
      navWhy: 'Por qué ayuda',
      navTools: 'Herramientas',
      navFaq: 'Preguntas',
      navContact: 'Contacto',
      heroEyebrow: 'coach de citas con IA · iOS',
      heroTitle: 'Deja de sobrepensar cada mensaje',
      heroLead:
        'Charmr te ayuda a escribir mensajes que suenan como tú. También te ayuda a mantener la calma cuando estás esperando, dudando o entrando en espiral.',
      appStoreAlt: 'Descargar Charmr en App Store',
      heroWhyLink: 'Por qué funciona →',
      heroOutcomesAria: 'Resultados principales',
      heroPoint1: 'Escribe respuestas claras más rápido',
      heroPoint2: 'Siente menos estrés entre mensajes',
      heroPoint3: 'Mantente fiel a tu voz',
      heroNote: 'Solo iOS. Cada sugerencia es opcional y editable.',
      phoneChip: 'Modo coaching',
      trustTitle: 'Funciona con conversaciones de',
      trustMore: '+ más',
      coachingTitle: 'Mucho más que un generador',
      coachingLead:
        'La mayoría no tiene problemas de vocabulario. Tiene presión, dudas y sobrepensamiento. Charmr está hecho para eso.',
      compareLeftTitle: 'La mayoría de herramientas',
      compareLeft1: 'Se enfocan solo en la próxima línea',
      compareLeft2: 'Empujan respuestas "perfectas"',
      compareLeft3: 'Pueden hacer que dudes más de ti',
      compareRightTitle: 'Enfoque de coaching de Charmr',
      compareRight1: 'Te ayuda con qué decir y por qué',
      compareRight2: 'Te ayuda a pausar antes de reaccionar',
      compareRight3: 'Construye confianza con tu propia voz',
      howTitle: 'Cómo funciona',
      howLead: 'Pasos simples para usar en conversaciones reales.',
      step1Title: 'Comparte el contexto',
      step1Body: 'Sube una captura para que Charmr entienda el tono y el ritmo del chat.',
      step2Title: 'Recibe opciones guiadas',
      step2Body: 'Obtén opciones que encajan con tu estilo y te ayudan a mantener la calma.',
      step3Title: 'Edita, envía o ignora',
      step3Body: 'Elige lo que te sirva, edítalo o no lo uses. Tú decides siempre.',
      toolsTitle: 'Herramientas útiles desde ya',
      toolsLead: 'Hecho para chats reales de citas, no para plantillas genéricas.',
      tool1Title: 'Guía para tu situación',
      tool1Body: 'Desde el primer mensaje hasta el seguimiento, con ayuda según el momento.',
      tool2Title: 'Reescrituras con tu voz',
      tool2Body: 'Mejora el tono y la claridad sin perder tu estilo.',
      tool3Title: 'Acceso en iOS al instante',
      tool3Body: 'Usa capturas y el teclado opcional cuando necesites ayuda rápida.',
      galleryTitle: 'Dentro de la app',
      galleryLead: 'Mira el flujo completo: inicio, chat coach, teclado y respuestas guiadas.',
      galleryAltHome: 'Pantalla de inicio de Charmr con acciones de coaching y contexto',
      galleryAltChat: 'Chat de coaching de Charmr para estrategia de mensajes',
      galleryAltKeyboard: 'Teclado personalizado de Charmr para ayuda en el momento',
      galleryAltReplies: 'Modal de respuesta con opciones guiadas para enviar con confianza',
      galleryCapHome: 'Inicio',
      galleryCapChat: 'Chat coach',
      galleryCapKeyboard: 'Teclado',
      galleryCapReplies: 'Respuestas guiadas',
      momentsTitle: 'Cuándo abrir Charmr',
      momentsLead: 'Úsalo en momentos que suelen generar estrés.',
      moment1Title: 'Cuando te trabas con una respuesta',
      moment1Body: 'Destrábate con opciones claras que encajan con tu tono.',
      moment2Title: 'Cuando entras en espiral esperando',
      moment2Body: 'Ajusta tu mentalidad para que una respuesta lenta no arruine tu día.',
      moment3Title: 'Cuando quieres sonar como tú',
      moment3Body: 'Reescribe borradores sin perder tu personalidad.',
      faqTitle: 'Preguntas',
      faqLead: 'Respuestas rápidas antes de descargar.',
      faq1Q: '¿Charmr es solo un generador de mensajes?',
      faq1A: 'No. Ayuda con las palabras, pero también con mentalidad, timing y confianza.',
      faq2Q: '¿Esto es terapia?',
      faq2A: 'No. Charmr es coaching de comunicación para citas, no un servicio de salud mental.',
      faq3Q: '¿Lee mis apps de citas directamente?',
      faq3A: 'No. Charmr solo usa lo que tú eliges compartir, como capturas.',
      faq4Q: '¿Me hará sonar falso?',
      faq4A: 'Al contrario. Puedes editar cada línea para que tus mensajes sigan sonando como tú.',
      faq5Q: '¿Charmr es gratis?',
      faq5A:
        'Puedes descargar y probar la app gratis. Los planes de pago y paquetes de mensajes pueden aplicar para uso más intenso. Revisa la App Store para el precio actual.',
      contactTitle: 'Contacto',
      contactLead: '¿Preguntas, feedback o ideas de colaboración? Escríbenos.',
      contactNameLabel: 'Nombre',
      contactEmailLabel: 'Correo',
      contactMessageLabel: 'Mensaje',
      contactSendButton: 'Enviar mensaje',
      footerPrivacy: 'Política de privacidad',
      footerTerms: 'Términos de servicio',
      footerAppStore: 'App Store',
      footerTagline: 'Escribe con claridad. Sal con confianza.',
      menuOpen: 'Abrir menú',
      menuClose: 'Cerrar menú',
    },
  };

  function resolveInitialLang() {
    var stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === 'en' || stored === 'es') return stored;

    var langs = [];
    if (Array.isArray(navigator.languages) && navigator.languages.length) {
      langs = navigator.languages;
    } else if (navigator.language) {
      langs = [navigator.language];
    }
    var hasSpanish = langs.some(function (entry) {
      return String(entry || '').toLowerCase().indexOf('es') === 0;
    });
    return hasSpanish ? 'es' : 'en';
  }

  function applyI18nAttrs(el, langPack) {
    var descriptor = el.getAttribute('data-i18n-attr');
    if (!descriptor) return;
    descriptor.split(',').forEach(function (rule) {
      var parts = rule.split(':');
      if (parts.length !== 2) return;
      var attrName = parts[0].trim();
      var key = parts[1].trim();
      if (!attrName || !key || !langPack[key]) return;
      el.setAttribute(attrName, langPack[key]);
    });
  }

  function applyLanguage(lang, persist) {
    var next = lang === 'es' ? 'es' : 'en';
    currentLang = next;
    var pack = MESSAGES[next];
    if (!pack) return;

    document.documentElement.lang = next;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key || !pack[key]) return;
      if (el.tagName === 'TITLE') {
        el.textContent = pack[key];
        document.title = pack[key];
      } else {
        el.textContent = pack[key];
      }
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      applyI18nAttrs(el, pack);
    });

    document.querySelectorAll('[data-lang-option]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang-option') === next;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        // no-op if storage is unavailable
      }
    }

    var menuToggle = document.getElementById('menu-toggle');
    var menuPanel = document.getElementById('nav-mobile');
    if (menuToggle && menuPanel) {
      var menuOpen = menuPanel.classList.contains('is-open');
      menuToggle.setAttribute(
        'aria-label',
        pack[menuOpen ? 'menuClose' : 'menuOpen'],
      );
    }
  }

  applyLanguage(resolveInitialLang(), false);

  document.querySelectorAll('[data-lang-option]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = btn.getAttribute('data-lang-option');
      applyLanguage(next, true);
    });
  });

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
    var menuWasOpen = false;
    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      var key = open ? 'menuClose' : 'menuOpen';
      toggle.setAttribute('aria-label', MESSAGES[currentLang][key]);
      if (open) {
        window.requestAnimationFrame(function () {
          var first = panel.querySelector('a[href^="#"], button');
          if (first) first.focus();
        });
      } else if (menuWasOpen) {
        toggle.focus();
      }
      menuWasOpen = open;
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
