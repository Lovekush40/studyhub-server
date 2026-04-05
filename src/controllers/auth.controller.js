import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import Student from '../models/student.model.js';

const AUTH_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@studyhub.com').split(',').map((x) => x.trim().toLowerCase());

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, __v, ...rest } = user.toObject ? user.toObject() : user;
  return rest;
};

const googleLogin = async (req, res) => {
  const { credential, role = 'STUDENT', requesterRole } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  try {
    const tokenInfo = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenInfo.ok) {
      const message = await tokenInfo.text();
      return res.status(401).json({ error: 'Invalid Google token', details: message });
    }

    const payload = await tokenInfo.json();
    const email = (payload.email || '').toLowerCase();
    const name = payload.name || payload.email || 'Google User';

    const normalizedRole = (role || 'STUDENT').toUpperCase();

    if (normalizedRole === 'TEACHER' && requesterRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN may create TEACHER accounts' });
    }
    if (normalizedRole === 'ADMIN' && !AUTH_ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Only whitelisted emails can become ADMIN' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const roleToCreate = normalizedRole === 'TEACHER' ? 'TEACHER' : normalizedRole === 'ADMIN' ? 'ADMIN' : 'STUDENT';
      const placeholderPassword = await bcrypt.hash(`${email}-${Date.now()}`, 10);
      user = await User.create({
        name,
        email,
        password: placeholderPassword,
        role: roleToCreate,
        created_at: new Date()
      });

      // Create Student record in database if role is STUDENT
      if (roleToCreate === 'STUDENT') {
        await Student.create({
          user_id: user._id,
          name,
          email
          // batch_id and course_id will be set by admin during enrollment
        });
      }
    }

    if (normalizedRole === 'TEACHER' && user.role !== 'TEACHER') {
      user.role = 'TEACHER';
      await user.save();
    }
    if (normalizedRole === 'ADMIN' && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await user.save();
    }

    const token = user.generateAccessToken();
    return res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Google login error', error);
    return res.status(500).json({ error: 'Google authentication failed' });
  }
};

const createTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required for teacher creation' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const teacher = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role: 'TEACHER'
  });

  res.status(201).json(sanitizeUser(teacher));
};

export default { googleLogin, createTeacher };

