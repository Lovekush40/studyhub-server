import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';

// ============================================
// CONDITIONAL PASSPORT CONFIG
// ============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  import('./config/passport.js');
}

// ============================================
// IMPORT ROUTES
// ============================================
import apiRoutes from './routes/api.routes.js';
import googleAuthRoutes from './routes/googleAuth.route.js';
import studentRoutes from './routes/student.routes.js';
import courseRoutes from './routes/course.routes.js';
import batchRoutes from './routes/batch.routes.js';

// ============================================
// IMPORT ERROR HANDLER
// ============================================
import { handleApiError } from './utils/apiError.js';

export const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(passport.initialize());
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(cookieParser());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  app.use(passport.initialize());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// HEALTH CHECK & TEST ENDPOINTS
// ============================================
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'StudyHub server is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/echo', (req, res) => {
  res.json({ received: req.body });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/v1', googleAuthRoutes);
app.use('/api/v1', apiRoutes);

// ============================================
// RESOURCE ROUTES
// ============================================
app.use('/api/v1/students', studentRoutes);

// ============================================
// ERROR HANDLER (MUST BE LAST)
// ============================================
app.use(handleApiError);

export default app;