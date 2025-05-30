import {firebaseAdmin} from '../src/config/firebase-admin';

const uid = process.argv[2];
if (!uid) {
  console.error('Please provide a user UID as an argument');
  process.exit(1);
}

async function addAdminClaim(uid: string) {
  try {
    // Set admin custom claim
    await firebaseAdmin.auth().setCustomUserClaims(uid, {admin: true});

    // Verify the claim was set
    const user = await firebaseAdmin.auth().getUser(uid);
    console.log('Successfully set admin claim for user:', {
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims,
    });
  } catch (error) {
    console.error('Error setting admin claim:', error);
  } finally {
    process.exit(0);
  }
}

addAdminClaim(uid);
