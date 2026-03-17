import express from 'express';
import { getAnalyticsSummary, trackVisit } from '../controllers/analyticsController.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/track', trackVisit);
router.get('/summary', requireAuth, requireAdmin, getAnalyticsSummary);

export default router;
