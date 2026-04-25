import mongoose from 'mongoose';

const publishedResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  link_url: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('PublishedResult', publishedResultSchema);
