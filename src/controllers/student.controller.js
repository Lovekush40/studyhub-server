import mongoose from 'mongoose';
import Student from '../models/student.model.js';
import Batch from '../models/batch.model.js';
import Course from '../models/course.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const getStudents = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  console.log('🔍 getStudents - User Role:', role, 'User ID:', req.user?._id);

  let studentQuery = {};

  if (role === 'ADMIN') {
    studentQuery = {};
  } else if (role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const batchIds = teacherBatches.map((b) => b._id);
    console.log('👨‍🏫 Teacher batches:', batchIds);
    studentQuery = { batch_id: { $in: batchIds } };
  } else {
    // STUDENT
    const studentOr = [];
    if (req.user._id) studentOr.push({ user_id: req.user._id });
    if (req.user.email) studentOr.push({ email: req.user.email });
    studentQuery = studentOr.length ? { $or: studentOr } : {};
  }

  console.log('📊 Student Query:', studentQuery);

  const students = await Student.find(studentQuery)
    .populate('course_id')
    .populate('batch_id');

  console.log('✅ Students found:', students.length);

  const transformed = students.map((student) => ({
    ...student.toObject(),
    batch_name: student.batch_id?.name || student.batch || 'Unassigned',
    course_name: student.course_id?.name || 'Unassigned'
  }));

  return sendSuccess(res, transformed);
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  return sendSuccess(res, student);
});

const createStudent = asyncHandler(async (req, res) => {
  const { user_id, name, father_name, dob, age, gender, contact, address, email, course_id, courseId, batch, batch_id, batchId, attendance, status } = req.body;
  const courseValue = course_id || courseId;
  const batchIdValue = batch_id || batchId;
  const batchNameValue = batch || '';

  // Role-based validation
  if (req.user.role === 'TEACHER') {
    // Teacher can only add students to their own batches
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const teacherBatchIds = teacherBatches.map((b) => b._id.toString());

    if (batchIdValue && !teacherBatchIds.includes(batchIdValue.toString())) {
      throw new ApiError(403, 'Teachers can only add students to their own batches');
    }
  }

  if (!name || !email || !batchIdValue || !courseValue) {
    throw new ApiError(400, 'Missing required fields: name, email, course and batch');
  }

  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new ApiError(400, 'Student with this email already exists');
  }

  const studentData = {
    user_id,
    name,
    father_name,
    dob,
    age,
    gender,
    contact,
    address,
    email,
    batch: batchNameValue || undefined,
    attendance,
    status
  };

  if (mongoose.Types.ObjectId.isValid(courseValue)) {
    studentData.course_id = courseValue;
  }

  if (mongoose.Types.ObjectId.isValid(batchIdValue)) {
    studentData.batch_id = batchIdValue;
    // Keep batch readable name if provided (or fallback to existing batch name lookup)
    if (!studentData.batch) {
      const batchObj = await Batch.findById(batchIdValue).select('name');
      studentData.batch = batchObj?.name || '';
    }
  } else if (batchNameValue) {
    studentData.batch = batchNameValue;
  }

  const newStudent = await Student.create(studentData);

  return sendCreated(res, newStudent);
});
const updateStudent = asyncHandler(async (req, res) => {
  const courseValue = req.body.course_id || req.body.courseId;
  const batchIdValue = req.body.batch_id || req.body.batchId;
  const batchNameValue = req.body.batch;

  // Role-based validation for TEACHER
  if (req.user.role === 'TEACHER') {
    // Get the existing student to check their batch
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) throw new ApiError(404, 'Student not found');

    // Get teacher's batches
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const teacherBatchIds = teacherBatches.map((b) => b._id.toString());

    // Check if trying to update batch - teacher can only update their own batch students
    const newBatchId = (batchIdValue || existingStudent.batch_id)?.toString();
    if (!teacherBatchIds.includes(newBatchId)) {
      throw new ApiError(403, 'Teachers can only update students in their own batches');
    }
  }

  const updatePayload = {
    ...req.body,
    course_id: courseValue,
    batch_id: batchIdValue,
    batch: batchNameValue
  };

  if (courseValue && mongoose.Types.ObjectId.isValid(courseValue)) {
    updatePayload.course_id = courseValue;
  } else {
    delete updatePayload.course_id;
  }

  if (batchIdValue && mongoose.Types.ObjectId.isValid(batchIdValue)) {
    updatePayload.batch_id = batchIdValue;
    if (!batchNameValue) {
      const batchObj = await Batch.findById(batchIdValue).select('name');
      updatePayload.batch = batchObj?.name || updatePayload.batch;
    }
  } else {
    delete updatePayload.batch_id;
  }

  const updated = await Student.findByIdAndUpdate(req.params.id, updatePayload, { new: true, runValidators: true });
  if (!updated) throw new ApiError(404, 'Student not found');
  return sendSuccess(res, updated);
});

const enrollStudent = asyncHandler(async (req, res) => {
  const { student_id, batch_id, course_id } = req.body;

  if (!student_id) {
    throw new ApiError(400, 'Missing required field: student_id');
  }

  if (!batch_id && !course_id) {
    throw new ApiError(400, 'Must provide at least batch_id or course_id');
  }

  const updatePayload = {};

  if (batch_id) {
    if (!mongoose.Types.ObjectId.isValid(batch_id)) {
      throw new ApiError(400, 'Invalid batch_id format');
    }
    updatePayload.batch_id = batch_id;

    // Get batch details to update batch name
    const batch = await Batch.findById(batch_id).select('name courseId').lean();
    if (!batch) throw new ApiError(404, 'Batch not found');
    updatePayload.batch = batch.name;
    updatePayload.course_id = batch.courseId;
  }

  if (course_id) {
    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      throw new ApiError(400, 'Invalid course_id format');
    }
    if (!updatePayload.course_id) {
      const course = await Course.findById(course_id).lean();
      if (!course) throw new ApiError(404, 'Course not found');
      updatePayload.course_id = course_id;
    }
  }

  const enrolledStudent = await Student.findByIdAndUpdate(
    student_id,
    updatePayload,
    { new: true, runValidators: true }
  )
    .populate('course_id')
    .populate({
      path: 'batch_id',
      populate: { path: 'courseId', model: 'Course' }
    });

  if (!enrolledStudent) throw new ApiError(404, 'Student not found');

  return sendSuccess(res, enrolledStudent);
});

const deleteStudent = asyncHandler(async (req, res) => {
  const deleted = await Student.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Student not found');
  return sendSuccess(res, { success: true }, 'Student deleted');
});

export default { getStudents, getStudent, createStudent, updateStudent, enrollStudent, deleteStudent };