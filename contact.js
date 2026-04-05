document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var statusDiv = document.getElementById('contact-status');
  var submitBtn = document.getElementById('contact-submit');
  if (!form || !statusDiv) return;

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
      statusDiv.textContent = 'Please fill in all fields.';
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
      submitBtn.textContent = 'Sending…';
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
        statusDiv.textContent = 'Thanks — your message was sent.';
        statusDiv.classList.add('is-success');
        form.reset();
      } else {
        statusDiv.textContent = 'Something went wrong. Please try again later.';
        statusDiv.classList.add('is-error');
      }
    } catch (err) {
      statusDiv.textContent = 'Something went wrong. Please try again later.';
      statusDiv.classList.add('is-error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send message';
      }
    }
  });
});
