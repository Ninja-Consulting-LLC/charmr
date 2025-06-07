// contact.js

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  const statusDiv = document.getElementById('contact-status');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    statusDiv.textContent = '';
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    // Compose the payload with required fields
    const payload = {
      userId: 'contact-form',
      email,
      message,
      plan: 'contact',
      dailyMessagesUsed: 0,
      dailyMessageLimit: 0,
      extraMessages: 0,
      name,
    };

    try {
      const response = await fetch(
        'https://ai-dating-keyboard.onrender.com/api/support',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Bypass': 'true',
          },
          body: JSON.stringify(payload),
        },
      );
      if (response.ok) {
        statusDiv.textContent = 'Thank you! Your message has been sent.';
        form.reset();
      } else {
        statusDiv.textContent =
          'Sorry, there was a problem sending your message.';
      }
    } catch (err) {
      statusDiv.textContent =
        'Sorry, there was a problem sending your message.';
    }
  });
});
