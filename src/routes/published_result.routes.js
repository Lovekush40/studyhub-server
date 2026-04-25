import express from 'express';
import { publishedResultController } from '../controllers/published_result.controller.js';
import { verifyJWT, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Public/Student routes (need to be logged in at least)
router.get('/', verifyJWT, publishedResultController.getPublishedResults);

// Admin only routes
router.post('/', verifyJWT, requireAdmin, publishedResultController.createPublishedResult);
router.delete('/:id', verifyJWT, requireAdmin, publishedResultController.deletePublishedResult);

export default router;
