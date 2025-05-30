import {firebaseAdmin} from '../src/config/firebase-admin';

async function listAdminUsers(nextPageToken?: string) {
  const result = await firebaseAdmin.auth().listUsers(1000, nextPageToken);
  result.users.forEach(user => {
    if (user.customClaims && user.customClaims.admin) {
      console.log({
        uid: user.uid,
        email: user.email,
        customClaims: user.customClaims,
      });
    }
  });
  if (result.pageToken) {
    await listAdminUsers(result.pageToken);
  }
}

listAdminUsers();
