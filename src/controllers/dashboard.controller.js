import Student from '../models/student.model.js';
import Batch from '../models/batch.model.js';
import Course from '../models/course.model.js';
import Test from '../models/test.model.js';
import StudentBatch from '../models/student_batch.model.js';

const getDashboardStats = async (req, res) => {
  const role = req.user?.role || 'STUDENT';

  if (role === 'ADMIN') {
    const [totalStudents, activeBatches, totalCourses, testsConducted] = await Promise.all([
      Student.countDocuments(),
      Batch.countDocuments(),
      Course.countDocuments(),
      Test.countDocuments()
    ]);

    const chartData = [
      { name: 'Week 1', students: Math.ceil(totalStudents * 0.2) },
      { name: 'Week 2', students: Math.ceil(totalStudents * 0.4) },
      { name: 'Week 3', students: Math.ceil(totalStudents * 0.6) },
      { name: 'Week 4', students: totalStudents }
    ];

    const upcomingEvents = await Batch.find({ start_date: { $gte: new Date() } })
      .sort({ start_date: 1 })
      .limit(4)
      .select('name start_date')
      .lean();

    return res.json({
      kpis: [
        { name: 'Total Students', value: totalStudents, color: 'text-green-500', bg: 'bg-green-100' },
        { name: 'Active Batches', value: activeBatches, color: 'text-blue-500', bg: 'bg-blue-100' },
        { name: 'Total Courses', value: totalCourses, color: 'text-indigo-500', bg: 'bg-indigo-100' },
        { name: 'Tests Conducted', value: testsConducted, color: 'text-purple-500', bg: 'bg-purple-100' }
      ],
      chartData,
      upcomingEvents: upcomingEvents.map((b) => ({ id: b._id, name: b.name, time: b.start_date.toLocaleDateString(), tags: 'Batch Start' })),
      enrolledCourses: [],
      enrolledBatches: []
    });
  }

  // STUDENT/TEACHER section
  let enrolledBatches = [];
  let enrolledCourses = [];
  let studentRecord = null;

  if (role === 'STUDENT') {
    studentRecord = await Student.findOne({ user_id: req.user._id }).lean();
    if (studentRecord) {
      const mappings = await StudentBatch.find({ student_id: studentRecord._id })
        .populate({
          path: 'batch_id',
          populate: { path: 'courseId', model: 'Course' }
        })
        .lean();

      enrolledBatches = mappings.map(m => ({
        id: m.batch_id?._id,
        name: m.batch_id?.name || m.batch_id?.batch_name,
        start_date: m.batch_id?.start_date,
        course: m.batch_id?.courseId ? (m.batch_id.courseId.name || m.batch_id.courseId.course_name) : undefined
      })).filter(b => b.id);

      enrolledCourses = Array.from(new Map(mappings
        .filter(m => m.batch_id?.courseId)
        .map(m => [m.batch_id.courseId._id.toString(), {
          id: m.batch_id.courseId._id,
          name: m.batch_id.courseId.name || m.batch_id.courseId.course_name,
          description: m.batch_id.courseId.description
        }])).values());
    }
  } else if (role === 'TEACHER') {
    const teacherBatches = await Batch.find({ teacher_id: req.user._id }).populate('courseId').lean();
    enrolledBatches = teacherBatches.map(b => ({
      id: b._id,
      name: b.name || b.batch_name,
      start_date: b.start_date,
      course: b.courseId ? (b.courseId.name || b.courseId.course_name) : undefined
    }));

    enrolledCourses = Array.from(new Map(teacherBatches
      .filter(b => b.courseId)
      .map(b => [b.courseId._id.toString(), {
        id: b.courseId._id,
        name: b.courseId.name || b.courseId.course_name,
        description: b.courseId.description
      }])).values());
  }

  const myBatchIds = enrolledBatches.map((b) => b.id);
  const upcomingTests = await Test.find({
    $or: [{ batch_id: { $in: myBatchIds } }, { batchId: { $in: myBatchIds } }],
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(4).lean();

  const allTestsCount = await Test.countDocuments({
    $or: [{ batch_id: { $in: myBatchIds } }, { batchId: { $in: myBatchIds } }]
  });

  const avgScore = studentRecord ? (studentRecord.lastTest || 0) : 0;

  return res.json({
    kpis: [
      { name: 'Enrolled Courses', value: enrolledCourses.length, color: 'text-green-500', bg: 'bg-green-100' },
      { name: 'Upcoming Tests', value: upcomingTests.length, color: 'text-blue-500', bg: 'bg-blue-100' },
      { name: 'Average Score', value: avgScore, color: 'text-indigo-500', bg: 'bg-indigo-100' }
    ],
    chartData: [
      { name: 'Week 1', score: 60, avg: 55 },
      { name: 'Week 2', score: 70, avg: 65 },
      { name: 'Week 3', score: 75, avg: 70 },
      { name: 'Week 4', score: 80, avg: 74 }
    ],
    upcomingEvents: upcomingTests.map((t) => ({ id: t._id, name: t.test_name, time: new Date(t.date).toLocaleDateString(), tags: t.subject || 'Test' })),
    enrolledCourses,
    enrolledBatches
  });
};

export default { getDashboardStats };