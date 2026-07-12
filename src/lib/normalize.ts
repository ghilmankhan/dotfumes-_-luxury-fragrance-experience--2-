// Shared type-coercion helpers for normalizing untrusted API payloads
// (Google Apps Script dashboard + product catalog responses) into typed values.

export type JsonObject = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const ensureArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export const parseText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

export const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const next = value.trim().toLowerCase();
    if (next === 'true' || next === '1' || next === 'yes') {
      return true;
    }
    if (next === 'false' || next === '0' || next === 'no') {
      return false;
    }
  }
  return fallback;
};
