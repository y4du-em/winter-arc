/**
 * Pure logic for the day-by-day list: per-habit status of each challenge day,
 * counts for smoking and drinking, an overview mode, and summaries.
 */

import { listDates } from './dates.js';
import { buildDailySeries } from './scoring.js';
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

const AVERAGE_DECIMALS = 1;

function findHabit(habitId) {
  const habit = HABITS.find((candidate) => candidate.id === habitId);
  if (!habit) throw new Error(`Unknown habit "${habitId}"`);
  return habit;
}

function pluralize(count, { singular, plural }) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function challengeDatesUpTo(settings, today) {
  return listDates(settings.startDate, settings.endDate).filter((date) => date <= today);
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

/**
 * One row per challenge day from day 1 up to today, for a single habit.
 * @param {object} settings
 * @param {object} entries Map of "YYYY-MM-DD" to entry.
 * @param {string} today
 * @param {string} habitId
 * @returns {{ date: string, dayNumber: number, status: string, count: string|null }[]}
 */
export function buildDayLog(settings, entries, today, habitId) {
  return challengeDatesUpTo(settings, today).map((date, index) => ({
    date,
    dayNumber: index + 1,
    status: dayStatus(habitId, entries[date]),
    count: countLabel(habitId, entries[date]),
  }));
}

/**
 * Keeps only the days where the habit was broken.
 * @param {{ status: string }[]} rows
 * @returns {{ status: string }[]}
 */
export function filterBrokenDays(rows) {
  return rows.filter((row) => row.status === DAY_STATUS.broken);
}

/**
 * Totals for a habit's day list.
 * @param {string} habitId
 * @param {{ date: string, status: string }[]} rows
 * @param {object} entries
 * @returns {{ kept: number, broken: number, missing: number, total: string|null }} total is e.g. "14 cigarettes" for counted habits.
 */
export function summarizeDayLog(habitId, rows, entries) {
  const countOf = (status) => rows.filter((row) => row.status === status).length;
  const counted = COUNTED_HABITS[habitId];
  const total = counted
    ? pluralize(rows.reduce((sum, row) => sum + (entries[row.date]?.[counted.field] ?? 0), 0), counted)
    : null;
  return { kept: countOf(DAY_STATUS.kept), broken: countOf(DAY_STATUS.broken), missing: countOf(DAY_STATUS.missing), total };
}

/**
 * One row per challenge day up to today with the day's points
 * (including any Sunday workout bonus or penalty) and how many habits were kept.
 * @param {object} settings
 * @param {object} entries
 * @param {string} today
 * @returns {{ date: string, dayNumber: number, status: string, points: number, keptCount: number|null, habitCount: number }[]}
 */
export function buildOverviewLog(settings, entries, today) {
  return buildDailySeries(settings, entries, today).map((day) => {
    const entry = entries[day.date];
    return {
      date: day.date,
      dayNumber: day.dayNumber,
      status: entry ? DAY_STATUS.kept : DAY_STATUS.missing,
      points: day.total,
      keptCount: entry ? HABITS.filter((habit) => habit.isMet(entry)).length : null,
      habitCount: HABITS.length,
    };
  });
}

/**
 * Totals for the overview list.
 * @param {ReturnType<typeof buildOverviewLog>} rows
 * @returns {{ logged: number, missing: number, averageKept: string|null, habitCount: number }} averageKept is null when nothing is logged.
 */
export function summarizeOverview(rows) {
  const logged = rows.filter((row) => row.keptCount !== null);
  const averageKept = logged.length > 0
    ? (logged.reduce((sum, row) => sum + row.keptCount, 0) / logged.length).toFixed(AVERAGE_DECIMALS)
    : null;
  return { logged: logged.length, missing: rows.length - logged.length, averageKept, habitCount: HABITS.length };
}
