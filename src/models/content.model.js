import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  file_url: { type: String },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

contentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
contentSchema.set('toJSON', { virtuals: true });
contentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Content', contentSchema);