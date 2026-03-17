import express from 'express';
import { trackVisit } from '../controllers/analyticsController.js';

const router = express.Router();

router.post('/track', trackVisit);

export default router;
