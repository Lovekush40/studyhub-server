import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  subject_name: { type: String, required: true },
  name: { type: String },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }
}, { timestamps: true });

subjectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
subjectSchema.set('toJSON', { virtuals: true });
subjectSchema.set('toObject', { virtuals: true });

export default mongoose.model('Subject', subjectSchema);