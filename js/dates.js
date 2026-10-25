/**
 * Calendar-date helpers working on local "YYYY-MM-DD" strings.
 * All arithmetic is done in UTC on the date parts only, so daylight-saving
 * changes and time zones can never shift a day.
 */

import { DAYS_PER_WEEK } from './config.js';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Checks whether a value is a real calendar date in "YYYY-MM-DD" form.
 * @param {unknown} value
 * @returns {boolean} False for wrong format or impossible dates like 2026-02-30.
 */
export function isISODate(value) {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toUTCTime(isoDate) {
  if (!isISODate(isoDate)) throw new TypeError(`Invalid ISO date: "${isoDate}"`);
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUTCTime(time) {
  return new Date(time).toISOString().slice(0, 10);
}

/**
 * Returns the local calendar date of a moment.
 * @param {Date} [now=new Date()]
 * @returns {string} "YYYY-MM-DD" in the device's time zone.
 */
export function toLocalISODate(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Moves a date forward or backward by whole days.
 * @param {string} isoDate
 * @param {number} days Negative to go back.
 * @returns {string}
 */
export function addDays(isoDate, days) {
  return fromUTCTime(toUTCTime(isoDate) + days * MS_PER_DAY);
}

/**
 * Number of days from one date to another.
 * @returns {number} Positive when `to` is after `from`, 0 when equal.
 */
export function daysBetween(from, to) {
  return Math.round((toUTCTime(to) - toUTCTime(from)) / MS_PER_DAY);
}

/**
 * Day of the week with Monday = 0 ... Sunday = 6.
 * @param {string} isoDate
 * @returns {number}
 */
export function dayOfWeek(isoDate) {
  const sundayBased = new Date(toUTCTime(isoDate)).getUTCDay();
  return (sundayBased + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
}

/**
 * Every date from start to end, both included.
 * @returns {string[]} Empty when end is before start.
 */
export function listDates(startDate, endDate) {
  const count = daysBetween(startDate, endDate) + 1;
  return Array.from({ length: Math.max(count, 0) }, (_, index) => addDays(startDate, index));
}

/**
 * Splits the challenge into Monday–Sunday weeks.
 * A week is "full" only when all 7 of its days fall inside the challenge;
 * partial first/last weeks are returned but flagged so weekly rules can skip them.
 * @returns {{ dates: string[], isFullWeek: boolean, lastDate: string }[]}
 */
export function challengeWeeks(startDate, endDate) {
  const weeks = [];
  let current = null;
  for (const date of listDates(startDate, endDate)) {
    if (current === null || dayOfWeek(date) === 0) {
      current = { dates: [] };
      weeks.push(current);
    }
    current.dates.push(date);
  }
  return weeks.map((week) => ({
    dates: week.dates,
    isFullWeek: week.dates.length === DAYS_PER_WEEK,
    lastDate: week.dates[week.dates.length - 1],
  }));
}

/**
 * Finds the Monday–Sunday week of the challenge containing a date.
 * @returns {object|null} The week from challengeWeeks, or null if outside the challenge.
 */
export function findWeekContaining(weeks, isoDate) {
  return weeks.find((week) => week.dates.includes(isoDate)) ?? null;
}

/**
 * Clamps a date into an inclusive range.
 * @returns {string}
 */
export function clampDate(isoDate, minDate, maxDate) {
  if (isoDate < minDate) return minDate;
  if (isoDate > maxDate) return maxDate;
  return isoDate;
}
