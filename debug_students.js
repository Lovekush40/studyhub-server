import mongoose from 'mongoose';
import Student from './src/models/student.model.js';
import StudentBatch from './src/models/student_batch.model.js';
import Batch from './src/models/batch.model.js';
import Course from './src/models/course.model.js';

import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/lkpra/OneDrive/Documents/Desktop/StudyHub_server/.env' });

mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME })
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      const studentQuery = {};

      const students = await Student.find(studentQuery)
        .populate('course_id')
        .populate('batch_id');
        
      console.log('Found students count:', students.length);

      const studentsWithBatches = await Promise.all(
        students.map(async (student) => {
          const studentObj = student.toObject();
          
          const allocatedBatches = await StudentBatch.find({ student_id: student._id })
            .populate('batch_id')
            .lean();

          studentObj.allocated_batches = allocatedBatches
            .filter(sb => sb.batch_id)
            .map(sb => ({
              _id: sb.batch_id._id,
              name: sb.batch_id.name || sb.batch_id.batch_name,
              id: sb.batch_id._id.toString()
            }));

          return {
            ...studentObj,
            batch_name: student.batch_id?.name || student.batch || 'Unassigned',
            course_name: student.course_id?.name || 'Unassigned'
          };
        })
      );

      console.log('Success, final array:', studentsWithBatches.length);
    } catch (err) {
      console.error('CRASH:', err.message);
      console.error(err.stack);
    }
    process.exit(0);
  });
