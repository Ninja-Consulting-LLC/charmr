import {config} from '../config/config';
import {firebaseAdmin} from '../config/firebase-admin';

const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: npm run user:info -- <userId>');
  process.exit(1);
}

const fetchUserInfo = async () => {
  try {
    // Create a custom token for the admin user
    const uid = 'admin-script';
    await firebaseAdmin.auth().setCustomUserClaims(uid, {admin: true});
    const customToken = await firebaseAdmin.auth().createCustomToken(uid);

    // Exchange custom token for ID token
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      },
    );

    const data = await response.json();
    const idToken = data.idToken;

    // Fetch user info with the ID token
    const userResponse = await fetch(
      `${config.server.apiBaseUrl.replace(
        /\/$/,
        '',
      )}/api/admin/users/${userId}/info`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      const error = await userResponse.json();
      throw new Error(error.error || 'Failed to fetch user info');
    }

    const userData = await userResponse.json();
    console.log(JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
};

fetchUserInfo();
