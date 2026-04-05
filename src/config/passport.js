import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const emailObj = profile.emails[0];
      const email = emailObj.value;
      const isVerified = emailObj.verified;

      // 1. Ensure only valid (verified) emails can register or log in
      if (!isVerified) {
        return done(null, false, { message: 'email_not_verified' });
      }

      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: email }
        ]
      });

      if (!user) {
        // 2. Check if the new user should be an ADMIN
        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
        const isAdmin = adminEmails.includes(email);

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          role: isAdmin ? 'ADMIN' : 'STUDENT'
        });
        
        console.log(`👤 New Google user registered: ${email} (Role: ${user.role})`);
      } else {
        // Link Google ID if user exists but logged in via email/password before
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
          console.log(`🔗 Linked Google ID for existing user: ${email}`);
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Session-less passport as we use JWT
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;