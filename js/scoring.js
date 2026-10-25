/**
 * Pure point calculations for daily entries and weekly workout rules.
 */

import { ALLOWED_PER_DAY } from './config.js';
import { challengeWeeks, findWeekContaining, listDates } from './dates.js';

/**
 * Points for a counted habit (cigarettes or drinks).
 * @param {number} count How many were had that day.
 * @param {{ zero: number, one: number, extraPenalty: number }} rules
 * @returns {number} `zero` for 0, `one` for 1, then `extraPenalty` subtracted for each one above the limit.
 */
export function scoreLimitedHabit(count, rules) {
  if (!Number.isInteger(count) || count < 0) return 0;
  if (count === 0) return rules.zero;
  const extra = Math.max(count - ALLOWED_PER_DAY, 0);
  return rules.one - extra * rules.extraPenalty;
}

/**
 * Whether the "new or feared thing" counts for the day.
 * Ticking it is not enough: a description must be written too.
 * @param {object|null|undefined} entry
 * @returns {boolean}
 */
export function isChallengeComplete(entry) {
  return Boolean(entry?.challengeDone) && typeof entry.challengeNote === 'string' && entry.challengeNote.trim().length > 0;
}

/**
 * Scores one logged day.
 * @param {object|null|undefined} entry Daily entry, or nothing for an unlogged day.
 * @param {object} points Point values from settings.points.
 * @returns {{ total: number, breakdown: Record<string, number> }} All zeros for an unlogged day.
 */
export function scoreDay(entry, points) {
  if (!entry) return { total: 0, breakdown: {} };

  const breakdown = {
    smoking: scoreLimitedHabit(entry.cigarettes, {
      zero: points.smokingZero,
      one: points.smokingOne,
      extraPenalty: points.smokingExtraPenalty,
    }),
    drinking: scoreLimitedHabit(entry.drinks, {
      zero: points.drinkingZero,
      one: points.drinkingOne,
      extraPenalty: points.drinkingExtraPenalty,
    }),
    workout: entry.workout ? points.workout : 0,
    food: entry.food ? points.food : 0,
    water: entry.water ? points.water : 0,
    sleep: entry.sleep ? points.sleep : 0,
    challenge: isChallengeComplete(entry) ? points.challenge : 0,
  };
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return { total, breakdown };
}

/**
 * Most points a single day can earn, before any weekly bonus.
 * @param {object} points
 * @returns {number}
 */
export function maxDailyPoints(points) {
  return (
    points.smokingZero + points.drinkingZero + points.workout + points.food +
    points.water + points.sleep + points.challenge
  );
}

/**
 * Counts workout days among the given dates.
 * @returns {number}
 */
export function countWorkouts(dates, entries) {
  return dates.filter((date) => entries[date]?.workout === true).length;
}

/**
 * Weekly workout bonus or penalty, booked on the week's Sunday.
 * Partial weeks (e.g. the final 2-day week) never get one.
 * The bonus shows from Sunday onward once the goal is reached; the penalty
 * only after Sunday has passed, so it never appears before Sunday's workout can be logged.
 * @param {{ dates: string[], isFullWeek: boolean, lastDate: string }} week
 * @param {object} entries
 * @param {object} settings
 * @param {string} today
 * @returns {number} Bonus (positive), penalty (negative) or 0.
 */
export function weeklyWorkoutAdjustment(week, entries, settings, today) {
  if (!week.isFullWeek || today < week.lastDate) return 0;
  const workouts = countWorkouts(week.dates, entries);
  if (workouts >= settings.workoutDaysPerWeek) return settings.points.weeklyWorkoutBonus;
  if (today > week.lastDate) return -settings.points.weeklyWorkoutPenalty;
  return 0;
}

/**
 * One point per challenge day up to today: day score, weekly adjustment and running total.
 * Future days are left out.
 * @param {object} settings
 * @param {object} entries Map of "YYYY-MM-DD" to entry.
 * @param {string} today
 * @returns {{ date: string, dayNumber: number, isLogged: boolean, dayPoints: number, weeklyAdjustment: number, total: number, cumulative: number }[]}
 */
export function buildDailySeries(settings, entries, today) {
  const weeks = challengeWeeks(settings.startDate, settings.endDate);
  let cumulative = 0;
  return listDates(settings.startDate, settings.endDate)
    .filter((date) => date <= today)
    .map((date, index) => {
      const entry = entries[date];
      const dayPoints = scoreDay(entry, settings.points).total;
      const week = findWeekContaining(weeks, date);
      const weeklyAdjustment = week.lastDate === date ? weeklyWorkoutAdjustment(week, entries, settings, today) : 0;
      const total = dayPoints + weeklyAdjustment;
      cumulative += total;
      return { date, dayNumber: index + 1, isLogged: Boolean(entry), dayPoints, weeklyAdjustment, total, cumulative };
    });
}
