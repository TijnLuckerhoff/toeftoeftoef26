import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import indexRouter from './routes/index.js';

dotenv.config({ path: 'variables.env' });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', indexRouter);

app.set('port', process.env.PORT || 3010);

const server = app.listen(app.get('port'), () => {
  console.log(`Allergies Detect API running on port ${server.address().port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${app.get('port')} is already in use. The backend is probably already running, or you can start another instance with a different PORT.`
    );
    process.exit(1);
  }

  throw error;
});
