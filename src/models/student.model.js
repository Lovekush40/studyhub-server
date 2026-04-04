import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  father_name: { type: String },
  dob: { type: Date },
  age: { type: Number },
  gender: { type: String },
  contact: { type: String },
  address: { type: String },
  email: { type: String },
  batch: { type: String },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  attendance: { type: Number, min: 0, max: 100, default: 100 },
  lastTest: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['Active', 'Warning', 'Critical'], default: 'Active' },
  enrollmentDate: { type: String, default: () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
}, { timestamps: true });

studentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Student', studentSchema);
