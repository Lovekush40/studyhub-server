import { Router } from 'express';
import {
  getApprovedReviews,
  getAllReviews,
  createReview,
  updateReviewStatus,
} from '../controllers/review.controller.js';
import { verifyJWT, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Public route to get approved reviews
router.route('/').get(getApprovedReviews);

// Protected routes (require login)
router.use(verifyJWT);

// Students can submit reviews
router.route('/').post(createReview);

// Admin only routes
router.route('/admin/all').get(requireAdmin, getAllReviews);
router.route('/:id/status').patch(requireAdmin, updateReviewStatus);

export default router;
