/**
 * BigInt Serialization Utility
 * Converts BigInt values to strings for JSON serialization
 */

/**
 * Recursively convert BigInt values to strings in an object
 * @param {*} obj - Object to process
 * @returns {*} Object with BigInt values converted to strings
 */
export function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item));
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * JSON stringify with BigInt support
 * @param {*} obj - Object to stringify
 * @returns {string} JSON string
 */
export function stringifyWithBigInt(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

/**
 * Create a JSON response with BigInt serialization
 * @param {NextApiResponse} res - Response object
 * @param {number} status - HTTP status code
 * @param {object} data - Data to send
 */
export function jsonResponse(res, status, data) {
  const serialized = serializeBigInt(data);
  return res.status(status).json(serialized);
}

