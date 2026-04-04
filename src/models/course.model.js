import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  course_name: { type: String, required: true },
  name: { type: String },
  description: { type: String, required: true },
  subjects: { type: [String], default: [] },
  activeBatches: { type: Number, default: 0, min: 0 },
  duration: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

courseSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

export default mongoose.model('Course', courseSchema);
