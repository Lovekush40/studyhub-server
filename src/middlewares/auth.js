import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized request' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'studyhub-secret');
    const user = await User.findById(decoded._id).select('-password');
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid access token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireAdminOrTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER')) {
    return res.status(403).json({ error: 'Admin or Teacher access required' });
  }
  next();
};