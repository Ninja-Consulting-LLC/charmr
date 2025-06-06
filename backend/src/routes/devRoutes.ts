import express from 'express';
import {
  checkSchemaHealth,
  getMatchSummary,
  updateMatchSummary,
} from '../controllers/devController';
import {getDatabase} from '../db';

const router = express.Router();

router.get('/schema-health', async (req, res) => {
  const db = await getDatabase();
  await checkSchemaHealth(req, res, db);
});

router.get('/matches/:userId/:matchId/summary', async (req, res) => {
  const db = await getDatabase();
  await getMatchSummary(req, res, db);
});

router.put('/matches/:userId/:matchId/summary', async (req, res) => {
  const db = await getDatabase();
  await updateMatchSummary(req, res, db);
});

export default router;
