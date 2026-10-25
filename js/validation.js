/**
 * Validators for settings, daily entries and weights.
 * Each returns a list of human-readable problems; an empty list means valid.
 */

import {
  CHALLENGE_NOTE_MAX_LENGTH,
  DAYS_PER_WEEK,
  DEFAULT_SETTINGS,
  MAX_DAILY_COUNT,
  MAX_HEIGHT_CM,
  MAX_WEIGHT_KG,
  MIN_HEIGHT_CM,
  MIN_WEIGHT_KG,
} from './config.js';
import { isISODate } from './dates.js';

const ENTRY_BOOLEAN_FIELDS = ['workout', 'food', 'water', 'sleep', 'challengeDone'];
const ENTRY_COUNT_FIELDS = ['cigarettes', 'drinks'];
const MAX_POINT_VALUE = 1000;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Checks a weight in kilograms.
 * @param {unknown} weightKg
 * @returns {string[]}
 */
export function validateWeight(weightKg) {
  return isNumberInRange(weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG)
    ? []
    : [`Weight must be a number between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg (got ${JSON.stringify(weightKg)}).`];
}

/**
 * Checks the settings object: dates, body measures, weekly goal and every point value.
 * @param {unknown} settings
 * @returns {string[]}
 */
export function validateSettings(settings) {
  if (!isPlainObject(settings)) return ['Settings must be an object.'];
  const errors = [];

  if (!isISODate(settings.startDate)) errors.push('Start date is not a valid date.');
  if (!isISODate(settings.endDate)) errors.push('End date is not a valid date.');
  if (errors.length === 0 && settings.endDate <= settings.startDate) errors.push('End date must be after the start date.');

  if (settings.heightCm !== null && !isNumberInRange(settings.heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM)) {
    errors.push(`Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm, or empty.`);
  }
  if (settings.goalWeightKg !== null && validateWeight(settings.goalWeightKg).length > 0) {
    errors.push(`Goal weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg, or empty.`);
  }
  if (!Number.isInteger(settings.workoutDaysPerWeek) || !isNumberInRange(settings.workoutDaysPerWeek, 1, DAYS_PER_WEEK)) {
    errors.push(`Workout days per week must be a whole number from 1 to ${DAYS_PER_WEEK}.`);
  }

  if (!isPlainObject(settings.points)) return [...errors, 'Point values are missing.'];
  for (const key of Object.keys(DEFAULT_SETTINGS.points)) {
    if (!isNumberInRange(settings.points[key], 0, MAX_POINT_VALUE)) {
      errors.push(`Point value "${key}" must be a number from 0 to ${MAX_POINT_VALUE}.`);
    }
  }
  return errors;
}

/**
 * Checks one daily entry.
 * @param {unknown} entry
 * @returns {string[]}
 */
export function validateEntry(entry) {
  if (!isPlainObject(entry)) return ['Entry must be an object.'];
  const errors = [];
  for (const field of ENTRY_COUNT_FIELDS) {
    if (!Number.isInteger(entry[field]) || !isNumberInRange(entry[field], 0, MAX_DAILY_COUNT)) {
      errors.push(`"${field}" must be a whole number from 0 to ${MAX_DAILY_COUNT}.`);
    }
  }
  for (const field of ENTRY_BOOLEAN_FIELDS) {
    if (typeof entry[field] !== 'boolean') errors.push(`"${field}" must be true or false.`);
  }
  if (typeof entry.challengeNote !== 'string' || entry.challengeNote.length > CHALLENGE_NOTE_MAX_LENGTH) {
    errors.push(`"challengeNote" must be text of at most ${CHALLENGE_NOTE_MAX_LENGTH} characters.`);
  }
  return errors;
}

/**
 * Checks a map of "YYYY-MM-DD" keys to values using an item validator.
 * @param {unknown} map
 * @param {string} label Used in error messages, e.g. "entries".
 * @param {(value: unknown) => string[]} validateItem
 * @returns {string[]}
 */
export function validateDateMap(map, label, validateItem) {
  if (!isPlainObject(map)) return [`"${label}" must be an object keyed by date.`];
  return Object.entries(map).flatMap(([date, value]) => {
    if (!isISODate(date)) return [`${label}: "${date}" is not a valid date.`];
    return validateItem(value).map((problem) => `${label} ${date}: ${problem}`);
  });
}
