const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function deleteRegisteredUser() {
  try {
    await db.collection('users').doc('aOTEOQBFmxZhEuyWuXIbabygMF42').delete();
    console.log('Successfully deleted registered user');
  } catch (error) {
    console.error('Error deleting registered user:', error);
  }
}

async function verifyLinking() {
  try {
    // Check registered user
    const registeredUserDoc = await db
      .collection('users')
      .doc('aOTEOQBFmxZhEuyWuXIbabygMF42')
      .get();
    console.log('\nRegistered User Data:');
    console.log(JSON.stringify(registeredUserDoc.data(), null, 2));

    // Check anonymous user
    const anonymousUserDoc = await db
      .collection('users')
      .doc('cFm1g96S9EvHgWtyH_eCaF')
      .get();
    console.log('\nAnonymous User Data:');
    console.log(JSON.stringify(anonymousUserDoc.data(), null, 2));

    // Check matches for anonymous user
    const anonymousMatchesSnapshot = await db
      .collection('users')
      .doc('cFm1g96S9EvHgWtyH_eCaF')
      .collection('matches')
      .get();

    console.log('\nMatches for Anonymous User:');
    anonymousMatchesSnapshot.forEach(doc => {
      console.log(`Match ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

    // Check matches for registered user
    const registeredMatchesSnapshot = await db
      .collection('users')
      .doc('aOTEOQBFmxZhEuyWuXIbabygMF42')
      .collection('matches')
      .get();

    console.log('\nMatches for Registered User:');
    registeredMatchesSnapshot.forEach(doc => {
      console.log(`Match ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

    // Check messages for each match in registered user
    console.log('\nMessages for Registered User Matches:');
    for (const matchDoc of registeredMatchesSnapshot.docs) {
      const messagesSnapshot = await matchDoc.ref.collection('messages').get();
      console.log(`\nMessages for Match ${matchDoc.id}:`);
      messagesSnapshot.forEach(doc => {
        console.log(`Message ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }

    // Check messages for each match in anonymous user
    console.log('\nMessages for Anonymous User Matches:');
    for (const matchDoc of anonymousMatchesSnapshot.docs) {
      const messagesSnapshot = await matchDoc.ref.collection('messages').get();
      console.log(`\nMessages for Match ${matchDoc.id}:`);
      messagesSnapshot.forEach(doc => {
        console.log(`Message ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }

    // Compare message counts and data
    const registeredUserData = registeredUserDoc.data();
    const anonymousUserData = anonymousUserDoc.data();

    console.log('\nMessage Count Comparison:');
    console.log('Registered User:', {
      dailyMessagesUsed: registeredUserData?.dailyMessagesUsed || 0,
      extraMessages: registeredUserData?.extraMessages || 0,
    });
    console.log('Anonymous User:', {
      dailyMessagesUsed: anonymousUserData?.dailyMessagesUsed || 0,
      extraMessages: anonymousUserData?.extraMessages || 0,
    });

    deleteRegisteredUser();
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyLinking().then(() => {
  console.log('\nVerification complete');
  process.exit(0);
});
