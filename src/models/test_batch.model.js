import mongoose from 'mongoose';

const testBatchSchema = new mongoose.Schema({
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true }
}, { timestamps: true });

testBatchSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
testBatchSchema.set('toJSON', { virtuals: true });
testBatchSchema.set('toObject', { virtuals: true });

export default mongoose.model('TestBatch', testBatchSchema);