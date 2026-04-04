import mongoose from 'mongoose';
import Content from '../models/content.model.js';
import Course from '../models/course.model.js';
import Subject from '../models/subject.model.js';
import Student from '../models/student.model.js';
import Batch from '../models/batch.model.js';
import StudentBatch from '../models/student_batch.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const getContents = asyncHandler(async (req, res) => {
  const { course_id, subject_id, batch_id } = req.query;
  const role = req.user?.role || 'STUDENT';
  let query = {};

  if (role === 'ADMIN') {
    // Admin sees all materials
    if (course_id && mongoose.Types.ObjectId.isValid(course_id)) {
      query.course_id = course_id;
    }
    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      query.subject_id = subject_id;
    }
    if (batch_id && mongoose.Types.ObjectId.isValid(batch_id)) {
      query.batch_id = batch_id;
    }
  } else if (role === 'TEACHER') {
    // Teacher sees materials for their batches
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).select('_id courseId').lean();
    const batchIds = teacherBatches.map((b) => b._id);
    const courseIds = [...new Set(teacherBatches.map((b) => String(b.courseId)).filter(Boolean))];

    query.$or = [
      { batch_id: { $in: batchIds } },
      { course_id: { $in: courseIds } }
    ];

    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      query.subject_id = subject_id;
    }
  } else if (role === 'STUDENT') {
    // STUDENT: fetch materials based on mapping from StudentBatch
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    if (!student) return sendSuccess(res, []);

    // Get all batch enrollments for this student
    const studentBatches = await StudentBatch.find({ student_id: student._id })
      .populate('batch_id')
      .lean();

    if (!studentBatches.length) {
      return sendSuccess(res, []);
    }

    const batchIds = studentBatches.map(sb => sb.batch_id?._id).filter(Boolean);
    const courseIds = [...new Set(studentBatches.map(sb => sb.batch_id?.courseId || sb.batch_id?.course_id).filter(Boolean))];

    query.$or = [];
    if (courseIds.length) query.$or.push({ course_id: { $in: courseIds } });
    if (batchIds.length) query.$or.push({ batch_id: { $in: batchIds } });

    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      query.subject_id = subject_id;
    }
  }

  const contents = await Content.find(query)
    .populate('subject_id', 'subject_name name')
    .populate('course_id', 'course_name name')
    .populate('batch_id', 'batch_name name')
    .populate('uploaded_by', 'name email role')
    .sort({ createdAt: -1 });

  return sendSuccess(res, contents);
});

const getContent = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  const content = await Content.findById(req.params.id)
    .populate('subject_id')
    .populate('course_id')
    .populate('batch_id')
    .populate('uploaded_by');

  if (!content) throw new ApiError(404, 'Content/Material not found');

  // Access control for students
  if (role === 'STUDENT') {
    const student = await Student.findOne({ user_id: req.user._id }).lean();
    if (!student) throw new ApiError(403, 'Access denied: Profile not found');

    // Check mapping for access
    const hasBatchMapping = content.batch_id && await StudentBatch.findOne({ 
      student_id: student._id,
      batch_id: content.batch_id
    });

    let hasCourseMapping = false;
    if (!hasBatchMapping && content.course_id) {
        const studentEnrollments = await StudentBatch.find({ student_id: student._id }).populate('batch_id');
        hasCourseMapping = studentEnrollments.some(sb => {
          const courseId = sb.batch_id?.courseId || sb.batch_id?.course_id;
          return String(courseId) === String(content.course_id);
        });
    }

    if (!hasBatchMapping && !hasCourseMapping) throw new ApiError(403, 'Access denied: Not enrolled in this course or batch');
  }

  return sendSuccess(res, content);
});

const createContent = asyncHandler(async (req, res) => {
  const { title, description, file_url, type, subject_id, course_id, batch_id } = req.body;

  if (!title || !file_url) {
    throw new ApiError(400, 'Missing required fields: title and file_url');
  }

  if (course_id && !mongoose.Types.ObjectId.isValid(course_id)) {
    throw new ApiError(400, 'Invalid course_id format');
  }
  if (subject_id && !mongoose.Types.ObjectId.isValid(subject_id)) {
    throw new ApiError(400, 'Invalid subject_id format');
  }
  if (batch_id && !mongoose.Types.ObjectId.isValid(batch_id)) {
    throw new ApiError(400, 'Invalid batch_id format');
  }

  // Verify course exists if provided
  if (course_id) {
    const courseExists = await Course.findById(course_id);
    if (!courseExists) throw new ApiError(404, 'Course not found');
  }

  // Verify subject exists if provided
  if (subject_id) {
    const subjectExists = await Subject.findById(subject_id);
    if (!subjectExists) throw new ApiError(404, 'Subject not found');
  }

  const contentData = {
    title,
    description: description || '',
    file_url,
    type: type || 'videos',
    subject_id: subject_id || undefined,
    course_id: course_id || undefined,
    batch_id: batch_id || undefined,
    uploaded_by: req.user._id
  };

  const newContent = await Content.create(contentData);
  await newContent.populate('subject_id course_id batch_id uploaded_by');

  return sendCreated(res, newContent);
});

const updateContent = asyncHandler(async (req, res) => {
  const { title, description, file_url, type, subject_id, course_id, batch_id } = req.body;

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (file_url !== undefined) updatePayload.file_url = file_url;
  if (type !== undefined) updatePayload.type = type;

  if (course_id !== undefined) {
    if (course_id && !mongoose.Types.ObjectId.isValid(course_id)) {
      throw new ApiError(400, 'Invalid course_id format');
    }
    if (course_id) {
      const courseExists = await Course.findById(course_id);
      if (!courseExists) throw new ApiError(404, 'Course not found');
    }
    updatePayload.course_id = course_id || null;
  }

  if (subject_id !== undefined) {
    if (subject_id && !mongoose.Types.ObjectId.isValid(subject_id)) {
      throw new ApiError(400, 'Invalid subject_id format');
    }
    if (subject_id) {
      const subjectExists = await Subject.findById(subject_id);
      if (!subjectExists) throw new ApiError(404, 'Subject not found');
    }
    updatePayload.subject_id = subject_id || null;
  }

  if (batch_id !== undefined) {
    if (batch_id && !mongoose.Types.ObjectId.isValid(batch_id)) {
      throw new ApiError(400, 'Invalid batch_id format');
    }
    updatePayload.batch_id = batch_id || null;
  }

  const updated = await Content.findByIdAndUpdate(req.params.id, updatePayload, {
    new: true,
    runValidators: true
  })
    .populate('subject_id')
    .populate('course_id')
    .populate('batch_id')
    .populate('uploaded_by');

  if (!updated) throw new ApiError(404, 'Content/Material not found');
  return sendSuccess(res, updated);
});

const deleteContent = asyncHandler(async (req, res) => {
  const deleted = await Content.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Content/Material not found');
  return sendSuccess(res, { success: true }, 'Material deleted');
});

export default { getContents, getContent, createContent, updateContent, deleteContent };
