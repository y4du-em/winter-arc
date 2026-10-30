/**
 * Default settings and fixed rules for the Winter Arc tracker.
 * Values in DEFAULT_SETTINGS are user-editable in the Settings screen;
 * the other exported constants are fixed rules of the app.
 */

export const DATA_VERSION = 1;

export const CHALLENGE_START_DATE = '2026-10-26';
export const CHALLENGE_END_DATE = '2027-02-02';

/** Cigarettes allowed per day before each extra one costs points. */
export const ALLOWED_PER_DAY = 1;

/** Highest count that still keeps the streak alive. */
export const SMOKING_STREAK_MAX = 1;
export const DRINKING_STREAK_MAX = 0;

export const STREAK_MILESTONES = [7, 14, 30, 50, 75, 100];

export const DAYS_PER_WEEK = 7;

export const CHALLENGE_NOTE_MAX_LENGTH = 200;
export const MAX_DAILY_COUNT = 99;

export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 400;
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 280;

export const BACKUP_REMINDER_DAYS = 7;

export const WEIGH_IN_DAY_OF_WEEK = 0; // Monday, using the Monday = 0 convention of dates.js

export const DEFAULT_SETTINGS = Object.freeze({
  startDate: CHALLENGE_START_DATE,
  endDate: CHALLENGE_END_DATE,
  heightCm: null,
  goalWeightKg: null,
  workoutDaysPerWeek: 5,
  points: Object.freeze({
    smokingZero: 10,
    smokingOne: 4,
    smokingExtraPenalty: 5,
    drinkingZero: 10,
    drinkingOne: 4,
    drinkingExtraPenalty: 5,
    workout: 10,
    food: 10,
    water: 5,
    sleep: 5,
    challenge: 10,
    noFap: 5,
    weeklyWorkoutBonus: 15,
    weeklyWorkoutPenalty: 15,
  }),
});

/**
 * Returns a fresh, mutable copy of the default settings.
 * @returns {object} Settings object safe to modify.
 */
export function createDefaultSettings() {
  return { ...DEFAULT_SETTINGS, points: { ...DEFAULT_SETTINGS.points } };
}
