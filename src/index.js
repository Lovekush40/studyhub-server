import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.routes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'StudyHub server is running'
  });
});

app.get('/health', (req, res) => {
  res.json({status: 'healthy'});
});

app.post('/echo', (req, res) => {
  res.json({received: req.body});
});

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`StudyHub server listening at http://localhost:${port}`);
});
