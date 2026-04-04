import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        const isAdmin = (process.env.ADMIN_EMAILS || 'admin@studyhub.com').split(',').map(e => e.trim().toLowerCase()).includes(profile.emails[0].value.toLowerCase());

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || profile.emails[0].value,
          email: profile.emails[0].value,
          role: isAdmin ? 'ADMIN' : 'STUDENT'
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});