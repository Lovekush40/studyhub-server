import mongoose from 'mongoose';
import Result from '../models/result.model.js';
import Student from '../models/student.model.js';
import Test from '../models/test.model.js';
import Batch from '../models/batch.model.js';
import StudentBatch from '../models/student_batch.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

// ============================================
// GET ALL RESULTS (Role-based filtering)
// ============================================
const getResults = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  let query = {};

  if (role === 'TEACHER') {
    // Teacher sees results for their batches
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const batchIds = teacherBatches.map(b => b._id);
    
    const studentMappings = await StudentBatch.find({ batch_id: { $in: batchIds } }).select('student_id').lean();
    const studentIds = studentMappings.map(m => m.student_id);
    
    query.student_id = { $in: studentIds };
  } else if (role === 'STUDENT') {
    // Student sees only their results
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    if (!student) return sendSuccess(res, []);
    query.student_id = student._id;
  }

  const results = await Result.find(query)
    .populate({
        path: 'student_id',
        select: 'name email batch'
    })
    .populate({
        path: 'test_id',
        select: 'test_name name subject total_marks totalMarks date'
    })
    .sort({ createdAt: -1 });

  return sendSuccess(res, results);
});

// ============================================
// GET SINGLE RESULT
// ============================================
const getResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id)
    .populate('student_id')
    .populate('test_id');

  if (!result) throw new ApiError(404, 'Result not found');

  const role = req.user?.role || 'STUDENT';
  if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    if (String(result.student_id._id) !== String(student?._id)) {
      throw new ApiError(403, 'Access denied: You can only view your own results');
    }
  }

  return sendSuccess(res, result);
});

// ============================================
// CREATE RESULT (Admin/Teacher)
// ============================================
const createResult = asyncHandler(async (req, res) => {
  const { student_id, test_id, score, rank } = req.body;

  if (!student_id || !test_id || score === undefined || rank === undefined) {
    throw new ApiError(400, 'Missing required fields: student_id, test_id, score, rank');
  }

  // Verification
  const student = await Student.findById(student_id);
  if (!student) throw new ApiError(404, 'Student not found');

  const test = await Test.findById(test_id);
  if (!test) throw new ApiError(404, 'Test not found');

  const newResult = await Result.create({
    student_id,
    test_id,
    score: Number(score),
    rank: Number(rank)
  });

  return sendCreated(res, newResult, 'Result recorded successfully');
});

// ============================================
// UPDATE RESULT
// ============================================
const updateResult = asyncHandler(async (req, res) => {
  const { score, rank } = req.body;
  const updatePayload = {};
  
  if (score !== undefined) updatePayload.score = Number(score);
  if (rank !== undefined) updatePayload.rank = Number(rank);

  const updated = await Result.findByIdAndUpdate(req.params.id, updatePayload, {
    new: true,
    runValidators: true
  });

  if (!updated) throw new ApiError(404, 'Result not found');
  return sendSuccess(res, updated, 'Result updated successfully');
});

// ============================================
// DELETE RESULT
// ============================================
const deleteResult = asyncHandler(async (req, res) => {
  const deleted = await Result.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Result not found');
  return sendSuccess(res, { success: true }, 'Result deleted successfully');
});

export default { 
  getResults, 
  getResult, 
  createResult, 
  updateResult, 
  deleteResult 
};
