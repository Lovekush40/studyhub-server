import express from 'express';
import batchController from '../controllers/batch.controller.js';
import { verifyJWT } from '../middlewares/auth.js';

const router = express.Router();

// ============================================
// BATCH ROUTES - AUTH REQUIRED
// ============================================

// GET all batches (with role-based filtering)
router.get('/', verifyJWT, batchController.getBatches);

// GET single batch
router.get('/:id', verifyJWT, batchController.getBatch);

// CREATE new batch
router.post('/', verifyJWT, batchController.createBatch);

// UPDATE batch
router.put('/:id', verifyJWT, batchController.updateBatch);

// DELETE batch
router.delete('/:id', verifyJWT, batchController.deleteBatch);

export default router;