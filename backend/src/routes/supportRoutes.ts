import express from 'express';
import {submitSupportRequest} from '../controllers/supportController';
import {authenticateUser} from '../middleware';

const router = express.Router();

// Add logging middleware specific to the support route
router.post(
  '/',
  (req, res, next) => {
    console.log(`[${new Date().toISOString()}] [Support] Support route hit:`, {
      path: req.path,
      method: req.method,
      body: req.body,
    });
    next();
  },
  authenticateUser,
  (req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] [Support] Route handler reached`,
    );
    submitSupportRequest(req, res).catch(next);
  },
);

export default router;
