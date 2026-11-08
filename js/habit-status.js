/**
 * Pure helpers for one habit on one day: kept, broken or not logged,
 * plus the cigarette or drink count. Used by the 100-day map.
 */

import { HABITS } from './streaks.js';

export const OVERVIEW_ID = 'overview';

export const DAY_STATUS = Object.freeze({
  kept: 'kept',
  broken: 'broken',
  missing: 'missing',
});

/** Habits that also record how many, with the words used to describe the count. */
const COUNTED_HABITS = Object.freeze({
  smoking: { field: 'cigarettes', singular: 'cigarette', plural: 'cigarettes' },
  smokeFree: { field: 'cigarettes', singular: 'cigarette', plural: 'cigarettes' },
  drinking: { field: 'drinks', singular: 'drink', plural: 'drinks' },
});

function findHabit(habitId) {
  const habit = HABITS.find((candidate) => candidate.id === habitId);
  if (!habit) throw new Error(`Unknown habit "${habitId}"`);
  return habit;
}

function pluralize(count, { singular, plural }) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Whether a habit was kept or broken on a day, using the same rules as streaks.
 * @param {string} habitId One of the HABITS ids.
 * @param {object|undefined} entry The day's entry, or undefined if not logged.
 * @returns {'kept'|'broken'|'missing'}
 * @throws {Error} For an unknown habit id.
 */
export function dayStatus(habitId, entry) {
  const habit = findHabit(habitId);
  if (!entry) return DAY_STATUS.missing;
  return habit.isMet(entry) ? DAY_STATUS.kept : DAY_STATUS.broken;
}

/**
 * The day's count for smoking or drinking, e.g. "3 cigarettes".
 * @param {string} habitId
 * @param {object|undefined} entry
 * @returns {string|null} Null for habits without a count and for unlogged days.
 */
export function countLabel(habitId, entry) {
  const counted = COUNTED_HABITS[habitId];
  if (!counted || !entry) return null;
  return pluralize(entry[counted.field], counted);
}
