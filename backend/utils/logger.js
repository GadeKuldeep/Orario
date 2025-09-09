// backend/utils/logger.js

/**
 * Simple logger utility
 * Can be later replaced with Winston or Morgan
 */
const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },
  error: (message, error = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) console.error(error);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  },
};

export default logger;
