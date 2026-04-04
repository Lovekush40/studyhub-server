import mongoose from 'mongoose';
import Student from '../models/student.model.js';
import StudentBatch from '../models/student_batch.model.js';
import Batch from '../models/batch.model.js';
import Course from '../models/course.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

// ============================================
// GET STUDENTS
// ============================================
const getStudents = asyncHandler(async (req, res) => {
  try {
    const role = req.user?.role || 'STUDENT';
    
    let studentQuery = {};

    if (role === 'ADMIN') {
      studentQuery = {};
    } else if (role === 'TEACHER') {
      const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
      const batchIds = teacherBatches.map((b) => b._id);
      studentQuery = { batch_id: { $in: batchIds } };
    } else {
      // STUDENT
      const studentOr = [];
      if (req.user._id) studentOr.push({ user_id: req.user._id });
      if (req.user.email) studentOr.push({ email: req.user.email });
      studentQuery = studentOr.length ? { $or: studentOr } : {};
    }

    const students = await Student.find(studentQuery);

    // Get additional batches for each student from StudentBatch table
    const studentsWithBatches = await Promise.all(
      students.map(async (student) => {
        const studentObj = student.toObject();
        
        // Fetch all allocated batches for this student
        const allocatedBatches = await StudentBatch.find({ student_id: student._id })
          .populate({
            path: 'batch_id',
            populate: { path: 'course_id' }
          })
          .lean();

        studentObj.allocated_batches = allocatedBatches
          .filter(sb => sb.batch_id)
          .map(sb => ({
            _id: sb.batch_id._id,
            name: sb.batch_id.name || sb.batch_id.batch_name,
            id: sb.batch_id._id.toString()
          }));

        const primaryBatch = allocatedBatches.find(sb => sb.batch_id)?.batch_id;

        return {
          ...studentObj,
          batch_name: primaryBatch ? (primaryBatch.name || primaryBatch.batch_name) : 'Unassigned',
          course_name: primaryBatch && primaryBatch.course_id ? primaryBatch.course_id.name : 'Unassigned'
        };
      })
    );

    return sendSuccess(res, studentsWithBatches);
  } catch (error) {
    console.error('CRITICAL GET STUDENTS ERROR:', error);
    return res.status(500).json({ status: 'error', message: error.toString(), stack: error.stack });
  }
});

// ============================================
// GET SINGLE STUDENT
// ============================================
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  // Get allocated batches
  const allocatedBatches = await StudentBatch.find({ student_id: req.params.id })
    .populate({
      path: 'batch_id',
      populate: { path: 'course_id' }
    })
    .lean();

  const studentObj = student.toObject();
  studentObj.allocated_batches = allocatedBatches
    .filter(sb => sb.batch_id)
    .map(sb => ({
      _id: sb.batch_id._id,
      name: sb.batch_id.name || sb.batch_id.batch_name,
      id: sb.batch_id._id.toString()
    }));

  return sendSuccess(res, studentObj);
});

// ============================================
// CREATE STUDENT WITH PRIMARY BATCH
// ============================================
const createStudent = asyncHandler(async (req, res) => {
  const {
    user_id,
    name,
    father_name,
    dob,
    age,
    gender,
    contact,
    address,
    email,
    course_id,
    courseId,
    batch_id,
    batchId,
    batch,
    attendance,
    lastTest,
    status
  } = req.body;

  const courseValue = course_id || courseId;
  const batchIdValue = batch_id || batchId;
  const batchNameValue = batch || '';

  // ========== VALIDATION ==========
  if (req.user.role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const teacherBatchIds = teacherBatches.map((b) => b._id.toString());

    if (batchIdValue && !teacherBatchIds.includes(batchIdValue.toString())) {
      throw new ApiError(403, 'Teachers can only add students to their own batches');
    }
  }

  if (!name || !email) {
    throw new ApiError(400, 'Missing required fields: name and email');
  }

  // Batch is no longer required explicitly on creation

  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new ApiError(400, 'Student with this email already exists');
  }

  // ========== CREATE STUDENT ==========
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
    attendance: attendance ?? 100,
    lastTest: lastTest ?? 0,
    status: status || 'Active'
  };

  if (mongoose.Types.ObjectId.isValid(courseValue)) {
    studentData.course_id = courseValue;
  }

  if (mongoose.Types.ObjectId.isValid(batchIdValue)) {
    studentData.batch_id = batchIdValue;
    
    // Get batch name for display
    if (!studentData.batch) {
      const batchObj = await Batch.findById(batchIdValue).select('name');
      studentData.batch = batchObj?.name || '';
    }
  }

  const newStudent = await Student.create(studentData);

  // ========== HANDLE OPTIONAL PRIMARY BATCH ==========
  if (batchIdValue) {
    await StudentBatch.create({
      student_id: newStudent._id,
      batch_id: batchIdValue
    });
    console.log('✅ Student created with primary batch mapping:', newStudent._id);
  } else {
    console.log('✅ Student created (Unassigned):', newStudent._id);
  }

  return sendCreated(res, newStudent, 'Student enrolled successfully');
});

// ============================================
// UPDATE STUDENT (No batch change on edit, only via allocate)
// ============================================
const updateStudent = asyncHandler(async (req, res) => {
  const {
    course_id,
    courseId,
    batch_id,
    batchId,
    batch,
    allocated_batches,
    ...updateData
  } = req.body;

  const studentId = req.params.id;
  const existingStudent = await Student.findById(studentId);

  if (!existingStudent) {
    throw new ApiError(404, 'Student not found');
  }

  // ========== ROLE-BASED VALIDATION ==========
  if (req.user.role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id').lean();
    const teacherBatchIds = teacherBatches.map((b) => b._id.toString());

    // Check if teacher can update this student
    const newBatchId = (batch_id || batchId || existingStudent.batch_id)?.toString();
    if (newBatchId && !teacherBatchIds.includes(newBatchId)) {
      throw new ApiError(403, 'Teachers can only update students in their own batches');
    }
  }

  // ========== UPDATE BASIC STUDENT INFO ==========
  const updatePayload = {
    ...updateData,
    attendance: updateData.attendance ?? existingStudent.attendance,
    lastTest: updateData.lastTest ?? existingStudent.lastTest,
    status: updateData.status || existingStudent.status
  };

  const updated = await Student.findByIdAndUpdate(
    studentId,
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new ApiError(404, 'Student not found');
  }

  // Fetch updated student with new batches
  const finalStudent = await Student.findById(studentId);

  const allocatedBatches = await StudentBatch.find({ student_id: studentId })
    .populate({
      path: 'batch_id',
      populate: { path: 'course_id' }
    })
    .lean();

  const studentObj = finalStudent.toObject();
  studentObj.allocated_batches = allocatedBatches
    .filter(sb => sb.batch_id)
    .map(sb => ({
      _id: sb.batch_id._id,
      name: sb.batch_id.name || sb.batch_id.batch_name,
      id: sb.batch_id._id.toString()
    }));

  return sendSuccess(res, studentObj, 'Student updated successfully');
});

// ============================================
// ALLOCATE BATCHES TO STUDENT (Separate Endpoint)
// ============================================
const allocateBatchesToStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const { batch_ids } = req.body;

  if (!studentId) {
    throw new ApiError(400, 'Student ID is required');
  }

  if (!Array.isArray(batch_ids)) {
    throw new ApiError(400, 'batch_ids array is required');
  }

  // Verify student exists
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  // Verify all batches exist
  const batches = await Batch.find({ _id: { $in: batch_ids } });
  if (batches.length !== batch_ids.length) {
    throw new ApiError(404, 'One or more batches not found');
  }

  // Delete existing allocations
  await StudentBatch.deleteMany({ student_id: studentId });

  // Create new allocations
  for (const batchId of batch_ids) {
    await StudentBatch.create({
      student_id: studentId,
      batch_id: batchId
    });
  }

  // Update student's primary fields (for UI consistency in tables)
  if (batch_ids.length > 0) {
      const primaryBatchId = batch_ids[0];
      const primaryBatch = batches.find(b => b._id.toString() === primaryBatchId.toString());
      
      await Student.findByIdAndUpdate(studentId, {
          batch_id: primaryBatchId,
          batch: primaryBatch?.name || 'Assigned'
      });
  } else {
      // If empty set, mark as unassigned
      await Student.findByIdAndUpdate(studentId, {
          batch_id: null,
          batch: 'Unassigned'
      });
  }

  console.log('✅ Allocated', batch_ids.length, 'batches to student:', studentId);

  return sendSuccess(res, { student_id: studentId, allocated_count: batch_ids.length }, 'Batches allocated successfully');
});

// ============================================
// REMOVE BATCH FROM STUDENT
// ============================================
const removeBatchFromStudent = asyncHandler(async (req, res) => {
  const { student_id, batch_id } = req.body;

  if (!student_id || !batch_id) {
    throw new ApiError(400, 'student_id and batch_id are required');
  }

  const deleted = await StudentBatch.findOneAndDelete({
    student_id,
    batch_id
  });

  if (!deleted) {
    throw new ApiError(404, 'Student-Batch allocation not found');
  }

  console.log('✅ Removed batch', batch_id, 'from student:', student_id);

  return sendSuccess(res, { success: true }, 'Batch removed from student');
});

// ============================================
// ENROLL STUDENT (Legacy - for backwards compatibility)
// ============================================
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

    // Get batch details
    const batch = await Batch.findById(batch_id).select('name course_id courseId').lean();
    if (!batch) throw new ApiError(404, 'Batch not found');
    
    updatePayload.batch = batch.name;
    updatePayload.course_id = batch.course_id || batch.courseId;

    // Create StudentBatch mapping
    await StudentBatch.create({
      student_id,
      batch_id
    });
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
  );

  if (!enrolledStudent) throw new ApiError(404, 'Student not found');

  console.log('✅ Student enrolled:', student_id);

  return sendSuccess(res, enrolledStudent, 'Student enrolled successfully');
});

// ============================================
// DELETE STUDENT
// ============================================
const deleteStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;

  // Delete student-batch mappings first
  await StudentBatch.deleteMany({ student_id: studentId });

  // Delete student
  const deleted = await Student.findByIdAndDelete(studentId);
  
  if (!deleted) {
    throw new ApiError(404, 'Student not found');
  }

  console.log('✅ Student deleted with all batch mappings:', studentId);

  return sendSuccess(res, { success: true, deletedId: studentId }, 'Student deleted successfully');
});

export default {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  allocateBatchesToStudent,
  removeBatchFromStudent,
  enrollStudent,
  deleteStudent
};