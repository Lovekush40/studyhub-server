import jwt from 'jsonwebtoken';
import passport from 'passport';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const googleCallback = (req, res, next) => {
  passport.authenticate(
    'google',
    { session: false },
    async (err, user, info) => {
      if (err || !user) {
        return res.redirect(`${FRONTEND_URL}/login?error=authentication_failed`);
      }

      const token = user.generateAccessToken();
      return res.redirect(`${FRONTEND_URL}/login?token=${token}`);
    }
  )(req, res, next);
};

const googleLogin = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

export { googleLogin, googleCallback };