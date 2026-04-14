import jwt from 'jsonwebtoken';
import passport from 'passport';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const googleCallback = (req, res, next) => {
  passport.authenticate(
    'google',
    { session: false },
    async (err, user, info) => {
      if (err || !user) {
        const error = info?.message || 'authentication_failed';
        return res.redirect(`${FRONTEND_URL}/login?error=${error}`);
      }

      const token = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      // Set Refresh Token as an httpOnly, Secure cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction, // true in production
        sameSite: isProduction ? 'none' : 'lax', // must be 'none' for cross-domain in production
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

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