import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './db/index.js';

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`StudyHub server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
