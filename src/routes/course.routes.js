import express from 'express';
import courseController from '../controllers/course.controller.js';
import { verifyJWT, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// ============================================
// COURSE ROUTES - AUTH REQUIRED
// ============================================

// GET all courses (with role-based filtering)
router.get('/', verifyJWT, courseController.getCourses);

// GET single course
router.get('/:id', verifyJWT, courseController.getCourse);

// CREATE new course
router.post('/', verifyJWT, requireAdmin, courseController.createCourse);

// UPDATE course
router.put('/:id', verifyJWT, requireAdmin, courseController.updateCourse);

// DELETE course
router.delete('/:id', verifyJWT, requireAdmin, courseController.deleteCourse);

export default router;