import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import Batch from '../models/batch.model.js';
import Student from '../models/student.model.js';
import StudentBatch from '../models/student_batch.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const getCourses = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'STUDENT';
  console.log('🔍 getCourses - User Role:', role, 'User ID:', req.user?._id);

  if (role === 'ADMIN') {
    const courses = await Course.find().sort({ createdAt: -1 });
    console.log('✅ Admin courses found:', courses.length);
    return sendSuccess(res, courses);
  }

  if (role === 'TEACHER') {
    // Teachers see courses associated with their batches
    const teacherBatches = await Batch.find({ teacher_id: req.user._id })
      .select('course_id courseId')
      .lean();
    
    const courseIds = [
      ...new Set(
        teacherBatches
          .map((b) => (b.course_id || b.courseId))
          .filter(Boolean)
      )
    ];
    
    console.log('👨‍🏫 Teacher course IDs:', courseIds);
    
    if (!courseIds.length) {
      return sendSuccess(res, []);
    }
    
    const courses = await Course.find({ _id: { $in: courseIds } }).sort({ createdAt: -1 });
    console.log('✅ Teacher courses found:', courses.length);
    return sendSuccess(res, courses);
  }

  // STUDENT: courses via enrolled student record and batches
  const studentQuery = [];
  if (req.user._id) studentQuery.push({ user_id: req.user._id });
  if (req.user.email) studentQuery.push({ email: req.user.email });
  
  const student = await Student.findOne(
    studentQuery.length ? { $or: studentQuery } : {}
  ).lean();
  
  if (!student) {
    console.log('⚠️ No student record found');
    return sendSuccess(res, []);
  }

  // Get all batches for this student from StudentBatch join table
  const studentBatches = await StudentBatch.find({ student_id: student._id })
    .populate({
      path: 'batch_id',
      select: 'course_id courseId'
    })
    .lean();
  
  const courseIds = new Set();
  
  // Direct course enrollment if any (legacy or standalone)
  if (student.course_id) {
    courseIds.add(String(student.course_id));
  }
  
  // Courses via batch enrollments in StudentBatch
  studentBatches.forEach(sb => {
    if (sb.batch_id && (sb.batch_id.course_id || sb.batch_id.courseId)) {
      courseIds.add(String(sb.batch_id.course_id || sb.batch_id.courseId));
    }
  });

  if (!courseIds.size) {
    console.log('⚠️ Student has no course enrollments');
    return sendSuccess(res, []);
  }

  const courses = await Course.find({ 
    _id: { $in: Array.from(courseIds) } 
  }).sort({ createdAt: -1 });
  
  console.log('✅ Student courses found:', courses.length);
  return sendSuccess(res, courses);
});

const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  
  return sendSuccess(res, course);
});

const createCourse = asyncHandler(async (req, res) => {
  const { 
    name,
    course_name,
    description, 
    subjects, 
    activeBatches, 
    duration 
  } = req.body;

  const courseName = name || course_name;

  // Validation
  if (!courseName || !courseName.trim()) {
    throw new ApiError(400, 'Course name is required');
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, 'Description is required');
  }

  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new ApiError(400, 'At least one subject is required');
  }

  // Filter and validate subjects
  const validSubjects = subjects
    .map(s => (typeof s === 'string' ? s.trim() : String(s).trim()))
    .filter(s => s.length > 0);

  if (validSubjects.length === 0) {
    throw new ApiError(400, 'At least one valid subject is required');
  }

  const courseData = {
    name: courseName.trim(),
    course_name: courseName.trim(),
    description: description.trim(),
    subjects: validSubjects,
    activeBatches: Math.max(0, activeBatches ?? 0),
    duration: Math.max(0, duration ?? 0),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('📝 Creating course:', courseName);

  const newCourse = await Course.create(courseData);

  console.log('✅ Course created:', newCourse._id);

  return sendCreated(res, newCourse);
});

const updateCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  // Verify course exists
  const existingCourse = await Course.findById(courseId);
  if (!existingCourse) {
    throw new ApiError(404, 'Course not found');
  }

  const { 
    name,
    course_name,
    description, 
    subjects, 
    activeBatches, 
    duration 
  } = req.body;

  const updatePayload = {};

  // Update name (support both field names)
  if (name !== undefined) {
    const courseName = name || course_name;
    if (!courseName || !courseName.trim()) {
      throw new ApiError(400, 'Course name cannot be empty');
    }
    updatePayload.name = courseName.trim();
    updatePayload.course_name = courseName.trim();
  }

  // Update description
  if (description !== undefined) {
    if (!description || !description.trim()) {
      throw new ApiError(400, 'Description cannot be empty');
    }
    updatePayload.description = description.trim();
  }

  // Update subjects
  if (subjects !== undefined) {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new ApiError(400, 'At least one subject is required');
    }
    const validSubjects = subjects
      .map(s => (typeof s === 'string' ? s.trim() : String(s).trim()))
      .filter(s => s.length > 0);
    
    if (validSubjects.length === 0) {
      throw new ApiError(400, 'At least one valid subject is required');
    }
    updatePayload.subjects = validSubjects;
  }

  // Update activeBatches
  if (activeBatches !== undefined) {
    updatePayload.activeBatches = Math.max(0, activeBatches);
  }

  // Update duration
  if (duration !== undefined) {
    updatePayload.duration = Math.max(0, duration);
  }

  updatePayload.updatedAt = new Date();

  console.log('📝 Updating course:', courseId);

  const updated = await Course.findByIdAndUpdate(
    courseId,
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new ApiError(404, 'Course not found');
  }

  console.log('✅ Course updated:', courseId);

  return sendSuccess(res, updated);
});

const deleteCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  // Check if course is in use by any batches
  const batchCount = await Batch.countDocuments({
    $or: [
      { course_id: courseId },
      { courseId: courseId }
    ]
  });

  if (batchCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete course. It is currently used by ${batchCount} batch(es).`
    );
  }

  // Check if course is in use by any students
  const studentCount = await Student.countDocuments({ course_id: courseId });

  if (studentCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete course. It is currently enrolled by ${studentCount} student(s).`
    );
  }

  const deleted = await Course.findByIdAndDelete(courseId);

  if (!deleted) {
    throw new ApiError(404, 'Course not found');
  }

  console.log('✅ Course deleted:', courseId);

  return sendSuccess(res, { success: true, deletedId: courseId }, 'Course deleted successfully');
});

// ============================================
// STUDENT ENROLLMENT ENDPOINTS
// ============================================

// Get all available courses for students to browse
const getAvailableCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  return sendSuccess(res, courses);
});

// Enroll student in a course
const enrollCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.courseId;
  const role = req.user?.role || 'STUDENT';

  // Only students can enroll
  if (role !== 'STUDENT') {
    throw new ApiError(403, 'Only students can enroll in courses');
  }

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  // Find or get student by user_id or email
  let student = await Student.findOne({
    $or: [
      { user_id: req.user._id },
      { email: req.user.email }
    ]
  });

  // If no student record, create one
  if (!student) {
    student = await Student.create({
      user_id: req.user._id,
      name: req.user.name || req.user.email,
      email: req.user.email,
      enrolled_courses: [courseId]
    });
    console.log('✅ New student created and enrolled:', student._id, courseId);
    return sendCreated(res, student, 'Successfully enrolled in course');
  }

  // Check if already enrolled
  if (student.enrolled_courses.includes(courseId)) {
    throw new ApiError(400, 'Already enrolled in this course');
  }

  // Add course to enrolled_courses
  student.enrolled_courses.push(courseId);
  await student.save();

  console.log('✅ Student enrolled in course:', student._id, courseId);
  return sendSuccess(res, student, 'Successfully enrolled in course');
});

// Unenroll student from a course
const unenrollCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.courseId;
  const role = req.user?.role || 'STUDENT';

  if (role !== 'STUDENT') {
    throw new ApiError(403, 'Only students can unenroll from courses');
  }

  const student = await Student.findOne({
    $or: [
      { user_id: req.user._id },
      { email: req.user.email }
    ]
  });

  if (!student) {
    throw new ApiError(404, 'Student record not found');
  }

  if (!student.enrolled_courses.includes(courseId)) {
    throw new ApiError(400, 'Not enrolled in this course');
  }

  student.enrolled_courses = student.enrolled_courses.filter(
    id => id.toString() !== courseId
  );
  await student.save();

  console.log('✅ Student unenrolled from course:', student._id, courseId);
  return sendSuccess(res, student, 'Successfully unenrolled from course');
});

// Get courses the student is enrolled in
const getStudentEnrolledCourses = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    $or: [
      { user_id: req.user._id },
      { email: req.user.email }
    ]
  }).populate('enrolled_courses');

  if (!student) {
    return sendSuccess(res, []);
  }

  return sendSuccess(res, student.enrolled_courses || []);
});

export default { 
  getCourses,
  getAvailableCourses,
  getCourse, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  enrollCourse,
  unenrollCourse,
  getStudentEnrolledCourses
};