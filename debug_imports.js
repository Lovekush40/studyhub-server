import 'dotenv/config';
import { app } from './src/app.js';
import { connectDB } from './src/db/index.js';
import Student from './src/models/student.model.js';
import StudentBatch from './src/models/student_batch.model.js';
import Batch from './src/models/batch.model.js';
import Course from './src/models/course.model.js';

console.log('🚀 Imports OK');
process.exit(0);
