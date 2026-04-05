document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var statusDiv = document.getElementById('contact-status');
  var submitBtn = document.getElementById('contact-submit');
  if (!form || !statusDiv) return;

  function getLang() {
    var pageLang = document.documentElement.lang || 'en';
    return String(pageLang).toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function t(key) {
    var lang = getLang();
    var dict = {
      en: {
        fillAll: 'Please fill in all fields.',
        sending: 'Sending...',
        sent: 'Thanks - your message was sent.',
        error: 'Something went wrong. Please try again later.',
        send: 'Send message',
      },
      es: {
        fillAll: 'Por favor completa todos los campos.',
        sending: 'Enviando...',
        sent: 'Gracias. Tu mensaje fue enviado.',
        error: 'Algo salió mal. Inténtalo de nuevo más tarde.',
        send: 'Enviar mensaje',
      },
    };
    return dict[lang][key] || dict.en[key];
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    statusDiv.textContent = '';
    statusDiv.classList.remove('is-error', 'is-success');

    var nameEl = document.getElementById('contact-name');
    var emailEl = document.getElementById('contact-email');
    var messageEl = document.getElementById('contact-message');
    if (!nameEl || !emailEl || !messageEl) return;

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    var message = messageEl.value.trim();

    if (!name || !email || !message) {
      statusDiv.textContent = t('fillAll');
      statusDiv.classList.add('is-error');
      return;
    }

    var payload = {
      userId: 'contact-form',
      email: email,
      message: message,
      plan: 'contact',
      dailyMessagesUsed: 0,
      dailyMessageLimit: 0,
      extraMessages: 0,
      name: name,
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('sending');
    }

    try {
      var response = await fetch('https://ai-dating-keyboard.onrender.com/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Bypass': 'true',
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        statusDiv.textContent = t('sent');
        statusDiv.classList.add('is-success');
        form.reset();
      } else {
        statusDiv.textContent = t('error');
        statusDiv.classList.add('is-error');
      }
    } catch (err) {
      statusDiv.textContent = t('error');
      statusDiv.classList.add('is-error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('send');
      }
    }
  });
});
