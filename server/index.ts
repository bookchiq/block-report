import app from './app.js';
import { logger } from './logger.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
