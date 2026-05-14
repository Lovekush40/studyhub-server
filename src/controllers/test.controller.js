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
    const tests = await Test.find().populate('courseId', 'name course_name');
    // Return raw data, let frontend handle status calculation to avoid timezone issues
    return sendSuccess(res, tests.map(test => test.toObject()));
  }

  let courseIds = [];

  if (role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('course_id courseId').lean();
    courseIds = [...new Set(teacherBatches.map((b) => (b.course_id || b.courseId)).filter(Boolean))];
  } else if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).populate('enrolled_courses').lean();
    if (student) {
      if (student.enrolled_courses && Array.isArray(student.enrolled_courses)) {
        student.enrolled_courses.forEach((course) => {
          if (course && course._id) courseIds.push(course._id);
        });
      }
      if (student.course_id) courseIds.push(student.course_id);
    }
  }

  const query = role === 'ADMIN' ? {} : { $or: [{ course_id: { $in: courseIds } }, { courseId: { $in: courseIds } }] };
  const tests = await Test.find(query).populate('courseId', 'name course_name');
  
  // Return raw data, let frontend handle status calculation to avoid timezone issues
  return sendSuccess(res, tests.map(test => test.toObject()));
});

const getTest = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  const test = await Test.findById(req.params.id).populate('courseId', 'title name');
  if (!test) throw new ApiError(404, 'Test not found');

  if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).populate('enrolled_courses').lean();
    if (!student) throw new ApiError(403, 'Access denied: Profile not found');

    const studentCourseIds = new Set();
    if (student.enrolled_courses && Array.isArray(student.enrolled_courses)) {
      student.enrolled_courses.forEach((course) => {
        if (course && course._id) studentCourseIds.add(String(course._id));
      });
    }
    if (student.course_id) studentCourseIds.add(String(student.course_id));

    const testCourseId = String(test.course_id || test.courseId);
    if (!studentCourseIds.has(testCourseId)) {
      throw new ApiError(403, 'Access denied: Not enrolled in this test\'s course');
    }
  } else if (role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('course_id courseId').lean();
    const teacherCourseIds = new Set(teacherBatches.map((b) => String(b.course_id || b.courseId)).filter(Boolean));
    const testCourseId = String(test.course_id || test.courseId);
    if (!teacherCourseIds.has(testCourseId)) {
      throw new ApiError(403, 'Access denied: You do not teach this test\'s course');
    }
  }

  // Return raw data, let frontend handle status calculation to avoid timezone issues
  return sendSuccess(res, test.toObject());
});

const createTest = asyncHandler(async (req, res) => {
  const { test_name, name, courseId, course_id, date, total_marks, duration, created_by, subject, form_url } = req.body;
  const testNameValue = test_name || name;
  const courseValue = courseId || course_id;

  if (!testNameValue || !courseValue || !date || total_marks === undefined || duration === undefined) {
    throw new ApiError(400, 'Missing required fields');
  }

  const dateObj = new Date(date);

  const testData = {
    test_name: testNameValue,
    name: testNameValue,
    date: dateObj,
    total_marks: Number(total_marks),
    totalMarks: Number(total_marks),
    duration: Number(duration),
    subject,
    form_url,
    created_by: created_by ? (mongoose.Types.ObjectId.isValid(created_by) ? created_by : undefined) : undefined
  };

  if (mongoose.Types.ObjectId.isValid(courseValue)) {
    testData.course_id = courseValue;
    testData.courseId = courseValue;
  } else {
    throw new ApiError(400, 'Invalid course ID');
  }

  const newTest = await Test.create(testData);

  return sendCreated(res, newTest);
});

const updateTest = asyncHandler(async (req, res) => {
  const testNameValue = req.body.test_name || req.body.name;
  const courseValue = req.body.courseId || req.body.course_id;

  let dateValue = undefined;
  if (req.body.date) {
    dateValue = new Date(req.body.date);
  }

  const updatePayload = {
    ...req.body,
    test_name: testNameValue || undefined,
    name: testNameValue || undefined,
    totalMarks: req.body.total_marks !== undefined ? Number(req.body.total_marks) : req.body.totalMarks,
    total_marks: req.body.total_marks !== undefined ? Number(req.body.total_marks) : req.body.totalMarks,
    duration: req.body.duration !== undefined ? Number(req.body.duration) : undefined,
    date: dateValue
  };

  if (courseValue) {
    if (mongoose.Types.ObjectId.isValid(courseValue)) {
      updatePayload.course_id = courseValue;
      updatePayload.courseId = courseValue;
    } else {
      throw new ApiError(400, 'Invalid course ID');
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