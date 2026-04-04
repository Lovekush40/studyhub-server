import mongoose from 'mongoose';
import Batch from '../models/batch.model.js';
import Student from '../models/student.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

// Helper function to parse various date formats
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Try parsing as ISO string first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try parsing UK format like "03 Apr 2026"
  const ukFormat = dateStr.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (ukFormat) {
    const [, day, month, year] = ukFormat;
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return new Date(year, monthMap[month], day);
  }
  
  // Fallback
  return new Date();
};

const getBatches = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';

  if (role === 'ADMIN') {
    const batches = await Batch.find();
    return sendSuccess(res, batches);
  }

  if (role === 'TEACHER') {
    const batches = await Batch.find({ teacher_id: req.user._id }).populate('courseId');
    return sendSuccess(res, batches);
  }

  // STUDENT
  const studentQuery = [];
  if (req.user._id) studentQuery.push({ user_id: req.user._id });
  if (req.user.email) studentQuery.push({ email: req.user.email });
  const student = await Student.findOne(studentQuery.length ? { $or: studentQuery } : {}).lean();
  if (!student) return sendSuccess(res, []);

  const batches = [];
  if (student.batch_id) {
    const batch = await Batch.findById(student.batch_id).populate('courseId');
    if (batch) batches.push(batch);
  }

  if (!batches.length && student.course_id) {
    const courseBatches = await Batch.find({ courseId: student.course_id }).populate('courseId');
    batches.push(...courseBatches);
  }

  return sendSuccess(res, batches);
});

const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, 'Batch not found');
  return sendSuccess(res, batch);
});

const createBatch = asyncHandler(async (req, res) => {
  const {
    course_id, courseId, course,
    teacher_id, teacherId,
    batch_name, name,
    start_date, end_date,
    start, days, timing, time,
    strength
  } = req.body;

  const courseValue = course || course_id || courseId;
  const batchName = batch_name || name;
  const teacherValue = teacher_id || teacherId;

  if (!courseValue || !batchName || !(start_date || start)) {
    throw new ApiError(400, 'Missing required fields: course_id/courseId, batch_name/name, start_date/start');
  }

  const batchData = {
    batch_name: batchName,
    name: batchName,
    start_date: start_date ? new Date(start_date) : (start ? parseDate(start) : new Date()),
    end_date: end_date ? new Date(end_date) : undefined,
    start: start || undefined,
    days,
    timing: timing || time,
    time: timing || time,
    strength: strength ?? 0
  };

  // Only set ObjectId fields if they are valid ObjectIds
  if (courseValue && mongoose.Types.ObjectId.isValid(courseValue)) {
    batchData.course_id = courseValue;
    batchData.courseId = courseValue;
  } else {
    batchData.course = String(courseValue);
  }

  if (teacherValue && mongoose.Types.ObjectId.isValid(teacherValue)) {
    batchData.teacher_id = teacherValue;
    batchData.teacherId = teacherValue;
  }

  const newBatch = await Batch.create(batchData);

  return sendCreated(res, newBatch);
});

const updateBatch = asyncHandler(async (req, res) => {
  const courseValue = req.body.course || req.body.course_id || req.body.courseId;
  const batchName = req.body.batch_name || req.body.name;
  const teacherValue = req.body.teacher_id || req.body.teacherId;

  const updatePayload = {
    ...req.body,
    batch_name: batchName || undefined,
    name: batchName || undefined,
    start_date: req.body.start_date ? new Date(req.body.start_date) : req.body.start ? parseDate(req.body.start) : undefined,
    end_date: req.body.end_date ? new Date(req.body.end_date) : undefined,
    timing: req.body.timing || req.body.time || undefined,
    time: req.body.timing || req.body.time || undefined
  };

  // Only set ObjectId fields if they are valid ObjectIds
  if (courseValue) {
    if (mongoose.Types.ObjectId.isValid(courseValue)) {
      updatePayload.course_id = courseValue;
      updatePayload.courseId = courseValue;
    } else {
      updatePayload.course = String(courseValue);
    }
  }

  if (teacherValue && mongoose.Types.ObjectId.isValid(teacherValue)) {
    updatePayload.teacher_id = teacherValue;
    updatePayload.teacherId = teacherValue;
  }

  const updated = await Batch.findByIdAndUpdate(req.params.id, updatePayload, { new: true, runValidators: true });

  if (!updated) throw new ApiError(404, 'Batch not found');
  return sendSuccess(res, updated);
});

const deleteBatch = asyncHandler(async (req, res) => {
  const deleted = await Batch.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Batch not found');
  return sendSuccess(res, { success: true }, 'Batch deleted');
});

export default { getBatches, getBatch, createBatch, updateBatch, deleteBatch };