'use strict';

process.env.CHARMR_USE_FIREBASE_EMULATOR = '1';
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8082';
process.env.CHARMR_FIRESTORE_EMULATOR_PROJECT_ID =
  process.env.CHARMR_FIRESTORE_EMULATOR_PROJECT_ID || 'charmr-firestore-test';
process.env.DATABASE_TYPE = 'firestore';
