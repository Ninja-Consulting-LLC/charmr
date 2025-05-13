import {config} from '../config/config';

const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: npm run user:info -- <userId>');
  process.exit(1);
}

const fetchUserInfo = async () => {
  try {
    const response = await fetch(
      `http://localhost:${config.server.port}/api/admin/users/${userId}/info`,
      {
        headers: {
          Authorization: `Bearer ${config.admin.token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user info');
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
};

fetchUserInfo();
