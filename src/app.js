import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  import('./config/passport.js');
}
import apiRoutes from './routes/api.routes.js';
import { handleApiError } from './utils/apiError.js';

export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(cookieParser());
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  app.use(passport.initialize());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'StudyHub server is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/echo', (req, res) => {
  res.json({ received: req.body });
});
import googleAuthRoutes from './routes/googleAuth.route.js';

app.use('/api/v1', googleAuthRoutes);app.use('/api/v1', apiRoutes);

app.use(handleApiError);
