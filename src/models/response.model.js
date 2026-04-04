import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selected_option: { type: String, enum: ['A', 'B', 'C', 'D'], required: true }
}, { timestamps: true });

responseSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
responseSchema.set('toJSON', { virtuals: true });
responseSchema.set('toObject', { virtuals: true });

export default mongoose.model('Response', responseSchema);