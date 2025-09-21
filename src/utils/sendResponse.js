import logger from './logger.js';

/**
 * Centralized response + logging
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {Boolean} success - success flag
 * @param {String} message - response message
 * @param {Object} data - payload
 * @param {Object} logMeta - metadata for logging
 */
export const sendResponse = (res, statusCode, success, message, data = {}, logMeta = {}) => {
  const response = {
    success,
    message,
    ...(data && Object.keys(data).length > 0 ? { data } : {})
  };

  if (success) {
    logger.info(message, logMeta);
  } else {
    logger.error(message, { ...logMeta, statusCode });
  }

  return res.status(statusCode).json(response);
};
