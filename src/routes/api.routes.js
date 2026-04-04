import express from 'express';
import courseController from '../controllers/course.controller.js';
import batchController from '../controllers/batch.controller.js';
import studentController from '../controllers/student.controller.js';
import testController from '../controllers/test.controller.js';
import authController from '../controllers/auth.controller.js';
import dashboardController from '../controllers/dashboard.controller.js';
import contentController from '../controllers/content.controller.js';
import { verifyJWT, requireAdmin, requireAdminOrTeacher } from '../middlewares/auth.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', verifyJWT, dashboardController.getDashboardStats);

// Auth
router.post('/auth/register', authController.registerUser);
router.post('/auth', authController.authenticateUser);
router.post('/auth/google', authController.googleLogin);
router.post('/auth/teacher', verifyJWT, requireAdmin, authController.createTeacher);

// Courses
router.get('/courses', verifyJWT, courseController.getCourses);
router.get('/courses/:id', verifyJWT, courseController.getCourse);
router.post('/courses', verifyJWT, requireAdmin, courseController.createCourse);
router.put('/courses/:id', verifyJWT, requireAdmin, courseController.updateCourse);
router.delete('/courses/:id', verifyJWT, requireAdmin, courseController.deleteCourse);

// Batches
router.get('/batches', verifyJWT, batchController.getBatches);
router.get('/batches/:id', verifyJWT, batchController.getBatch);
router.post('/batches', verifyJWT, requireAdmin, batchController.createBatch);
router.put('/batches/:id', verifyJWT, requireAdmin, batchController.updateBatch);
router.delete('/batches/:id', verifyJWT, requireAdmin, batchController.deleteBatch);

// Students
router.get('/students', verifyJWT, studentController.getStudents);
router.get('/students/:id', verifyJWT, requireAdminOrTeacher, studentController.getStudent);
router.post('/students', verifyJWT, requireAdminOrTeacher, studentController.createStudent);
router.put('/students/:id', verifyJWT, requireAdminOrTeacher, studentController.updateStudent);
router.post('/students/:id/enroll', verifyJWT, requireAdminOrTeacher, studentController.enrollStudent);
router.delete('/students/:id', verifyJWT, requireAdmin, studentController.deleteStudent);

// Tests
router.get('/tests', verifyJWT, testController.getTests);
router.get('/tests/:id', verifyJWT, testController.getTest);
router.post('/tests', verifyJWT, requireAdmin, testController.createTest);
router.put('/tests/:id', verifyJWT, requireAdmin, testController.updateTest);
router.delete('/tests/:id', verifyJWT, requireAdmin, testController.deleteTest);

// Course Materials/Content
router.get('/materials', verifyJWT, contentController.getContents);
router.get('/materials/:id', verifyJWT, contentController.getContent);
router.post('/materials', verifyJWT, requireAdmin, contentController.createContent);
router.put('/materials/:id', verifyJWT, requireAdmin, contentController.updateContent);
router.delete('/materials/:id', verifyJWT, requireAdmin, contentController.deleteContent);

export default router;