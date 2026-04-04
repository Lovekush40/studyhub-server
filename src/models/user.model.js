import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], default: 'STUDENT' },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET || 'studyhub-secret',
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' }
  );
};

userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);