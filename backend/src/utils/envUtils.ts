export const logEnvironmentVariables = () => {
  try {
    console.log('\n=== Environment Variables ===');

    // Define environment variables that are actually used in the application
    const envVars = [
      'NODE_ENV',
      'PORT',
      'OPENAI_API_KEY',
      'OPENAI_MODEL',
      'OPENAI_SANDBOX_MODE',
      'CORS_ORIGIN',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'MAX_TOKENS',
      'TEMPERATURE',
    ];

    envVars.forEach(key => {
      if (process.env[key]) {
        // Redact sensitive values
        if (key.toLowerCase().includes('key')) {
          console.log(`${key}: [REDACTED]`);
        } else {
          console.log(`${key}: ${process.env[key]}`);
        }
      }
    });

    console.log('==========================\n');
  } catch (error) {
    console.error('Error logging environment variables:', error);
  }
};
