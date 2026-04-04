import mongoose from 'mongoose';
import Test from '../models/test.model.js';
import Student from '../models/student.model.js';
import Batch from '../models/batch.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const getTests = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';

  if (role === 'ADMIN') {
    const tests = await Test.find().populate('courseId batchId', 'name course_name');
    const transformedAll = tests.map((test) => ({ ...test.toObject(), status: test.date > new Date() ? 'Upcoming' : 'Completed' }));
    return sendSuccess(res, transformedAll);
  }

  let batchIds = [];

  if (role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    batchIds = teacherBatches.map((b) => b._id);
  }

  if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    if (student?.batch_id) {
      batchIds = [student.batch_id];
    }
  }

  const tests = await Test.find({ $or: [{ batch_id: { $in: batchIds } }, { batchId: { $in: batchIds } }] }).populate('courseId batchId', 'name course_name');
  const transformed = tests.map((test) => ({ ...test.toObject(), status: test.date > new Date() ? 'Upcoming' : 'Completed' }));
  return sendSuccess(res, transformed);
});

const getTest = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  const test = await Test.findById(req.params.id).populate('courseId batchId', 'title name');
  if (!test) throw new ApiError(404, 'Test not found');

  // Access control for students
  if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    const hasAccess = student?.batch_id && (String(student.batch_id) === String(test.batch_id) || String(student.batch_id) === String(test.batchId));

    if (!hasAccess) throw new ApiError(403, 'Access denied');
  }

  return sendSuccess(res,{ ...test.toObject(), status: test.date > new Date() ? 'Upcoming' : 'Completed' });
});

const createTest = asyncHandler(async (req, res) => {
  const { test_name, name, courseId, course_id, batchId, batch_id, date, total_marks, duration, created_by, subject, form_url } = req.body;
  const testNameValue = test_name || name;
  const courseValue = courseId || course_id;
  const batchValue = batchId || batch_id;

  if (!testNameValue || !courseValue || !batchValue || !date || total_marks === undefined || duration === undefined) {
    throw new ApiError(400, 'Missing required fields');
  }

  const testData = {
    test_name: testNameValue,
    name: testNameValue,
    date: new Date(date),
    total_marks: Number(total_marks),
    totalMarks: Number(total_marks),
    duration: Number(duration),
    subject,
    form_url,
    created_by: created_by ? (mongoose.Types.ObjectId.isValid(created_by) ? created_by : undefined) : undefined
  };

  // Convert course and batch IDs to ObjectIds if valid
  if (mongoose.Types.ObjectId.isValid(courseValue)) {
    testData.course_id = courseValue;
    testData.courseId = courseValue;
  } else {
    throw new ApiError(400, 'Invalid course ID');
  }

  if (mongoose.Types.ObjectId.isValid(batchValue)) {
    testData.batch_id = batchValue;
    testData.batchId = batchValue;
  } else {
    throw new ApiError(400, 'Invalid batch ID');
  }

  const newTest = await Test.create(testData);

  return sendCreated(res, newTest);
});

const updateTest = asyncHandler(async (req, res) => {
  const testNameValue = req.body.test_name || req.body.name;
  const courseValue = req.body.courseId || req.body.course_id;
  const batchValue = req.body.batchId || req.body.batch_id;

  const updatePayload = {
    ...req.body,
    test_name: testNameValue || undefined,
    name: testNameValue || undefined,
    totalMarks: req.body.total_marks !== undefined ? Number(req.body.total_marks) : req.body.totalMarks,
    total_marks: req.body.total_marks !== undefined ? Number(req.body.total_marks) : req.body.totalMarks,
    duration: req.body.duration !== undefined ? Number(req.body.duration) : undefined,
    date: req.body.date ? new Date(req.body.date) : undefined
  };

  // Only update ObjectId fields if they are valid
  if (courseValue) {
    if (mongoose.Types.ObjectId.isValid(courseValue)) {
      updatePayload.course_id = courseValue;
      updatePayload.courseId = courseValue;
    } else {
      throw new ApiError(400, 'Invalid course ID');
    }
  }

  if (batchValue) {
    if (mongoose.Types.ObjectId.isValid(batchValue)) {
      updatePayload.batch_id = batchValue;
      updatePayload.batchId = batchValue;
    } else {
      throw new ApiError(400, 'Invalid batch ID');
    }
  }

  const updated = await Test.findByIdAndUpdate(
    req.params.id,
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!updated) throw new ApiError(404, 'Test not found');
  return sendSuccess(res, updated);
});

const deleteTest = asyncHandler(async (req, res) => {
  const deleted = await Test.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Test not found');
  return sendSuccess(res, { success: true }, 'Test deleted');
});

export default { getTests, getTest, createTest, updateTest, deleteTest };