import mongoose from 'mongoose';

const studentBatchSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true }
}, { timestamps: true });

studentBatchSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
studentBatchSchema.set('toJSON', { virtuals: true });
studentBatchSchema.set('toObject', { virtuals: true });

export default mongoose.model('StudentBatch', studentBatchSchema);