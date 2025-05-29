import {firebaseAdmin} from '../src/config/firebase-admin';

const uid = process.argv[2];
if (!uid) {
  console.error('Please provide a user UID as an argument');
  process.exit(1);
}

async function removeAdminClaim(uid: string) {
  try {
    // Remove the admin claim by setting it to undefined
    await firebaseAdmin.auth().setCustomUserClaims(uid, {admin: undefined});

    // Verify the claim was removed
    const user = await firebaseAdmin.auth().getUser(uid);
    console.log('Successfully removed admin claim for user:', {
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims,
    });
  } catch (error) {
    console.error('Error removing admin claim:', error);
  } finally {
    process.exit(0);
  }
}

removeAdminClaim(uid);
