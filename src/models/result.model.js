import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

resultSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

export default mongoose.model('Result', resultSchema);