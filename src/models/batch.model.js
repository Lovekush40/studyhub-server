import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batch_name: { type: String, required: true },
  name: { type: String },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  start: { type: String },
  days: { type: String, default: '' },
  timing: { type: String, default: '' },
  time: { type: String, default: '' },
  strength: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

batchSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

export default mongoose.model('Batch', batchSchema);
