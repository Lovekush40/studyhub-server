import express from 'express';
import studentController from '../controllers/student.controller.js';
import { verifyJWT } from '../middlewares/auth.js';

const router = express.Router();

// ============================================
// STUDENT ROUTES - AUTH REQUIRED
// ============================================

// GET all students (with role-based filtering)
router.get('/', verifyJWT, studentController.getStudents);

// GET single student
router.get('/:id', verifyJWT, studentController.getStudent);

// CREATE new student with primary batch enrollment
router.post('/', verifyJWT, studentController.createStudent);

// UPDATE student (basic info only, no batch change)
router.put('/:id', verifyJWT, studentController.updateStudent);

// DELETE student (also removes all batch mappings)
router.delete('/:id', verifyJWT, studentController.deleteStudent);

// ============================================
// BATCH ALLOCATION ENDPOINTS
// ============================================

// ALLOCATE multiple batches to a student
// POST /students/:id/allocate-batches
// Body: { batch_ids: ['batch1', 'batch2', ...] }
router.post('/:id/allocate-batches', verifyJWT, async (req, res) => {
  try {
    await studentController.allocateBatchesToStudent(
      { body: { student_id: req.params.id, batch_ids: req.body.batch_ids } },
      res
    );
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// REMOVE single batch from student
// POST /students/remove-batch
// Body: { student_id, batch_id }
router.post('/remove-batch', verifyJWT, studentController.removeBatchFromStudent);

// ENROLL student in batch (legacy - for backwards compatibility)
// POST /students/enroll
// Body: { student_id, batch_id, course_id }
router.post('/enroll', verifyJWT, studentController.enrollStudent);

export default router;