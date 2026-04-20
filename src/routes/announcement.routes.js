import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js';
import { verifyJWT, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Public/All users can view active announcements
router.route('/').get(getAnnouncements);

// Below routes require authentication and admin privileges
router.use(verifyJWT);
router.use(requireAdmin);

router.route('/').post(createAnnouncement);
router.route('/:id').put(updateAnnouncement).delete(deleteAnnouncement);

export default router;
