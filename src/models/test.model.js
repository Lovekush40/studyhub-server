import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  test_name: { type: String, required: true },
  name: { type: String },
  subject: { type: String },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  total_marks: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  form_url: { type: String }
}, { timestamps: true });

testSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

export default mongoose.model('Test', testSchema);
