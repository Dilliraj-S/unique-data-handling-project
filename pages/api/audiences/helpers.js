import { Long } from 'mongodb';

export const toLong = (value) => {
  if (value instanceof Long) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Long.fromNumber(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return Long.fromNumber(parsed);
    }
  }

  throw new Error('Invalid numeric identifier');
};

export const normalizeId = (value) => {
  if (value instanceof Long) {
    return value.toNumber();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value || null;
};

export const getNextNumericValue = async (collection) => {
  const lastDoc = await collection.findOne({}, { sort: { id: -1 }, projection: { id: 1 } });

  if (!lastDoc || lastDoc.id === undefined || lastDoc.id === null) {
    return 1;
  }

  const lastId =
    lastDoc.id instanceof Long ? lastDoc.id.toNumber() : Number(lastDoc.id);

  return (Number.isNaN(lastId) ? 0 : lastId) + 1;
};

export const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const mapAudience = (audience) => ({
  id: normalizeId(audience?.id ?? audience?._id),
  name: audience?.name || '',
  created_at: audience?.created_at || null,
  updated_at: audience?.updated_at || null,
});

export const sanitizeSubscriberPayload = (subscriber = {}) => {
  const safe = {
    first_name: subscriber.first_name?.toString().trim() || '',
    last_name: subscriber.last_name?.toString().trim() || '',
    email: subscriber.email?.toString().trim().toLowerCase() || '',
  };

  if (!safe.email) {
    return null;
  }

  return safe;
};

