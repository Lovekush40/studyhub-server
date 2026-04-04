import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  question_text: { type: String, required: true },
  option_a: { type: String, required: true },
  option_b: { type: String, required: true },
  option_c: { type: String, required: true },
  option_d: { type: String, required: true },
  correct_option: { type: String, enum: ['A', 'B', 'C', 'D'], required: true }
}, { timestamps: true });

questionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
questionSchema.set('toJSON', { virtuals: true });
questionSchema.set('toObject', { virtuals: true });

export default mongoose.model('Question', questionSchema);