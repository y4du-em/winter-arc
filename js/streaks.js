/**
 * Pure streak, badge and perfect-week calculations.
 */

import { DRINKING_STREAK_MAX, SMOKING_STREAK_MAX, STREAK_MILESTONES } from './config.js';
import { challengeWeeks, listDates } from './dates.js';
import { countWorkouts, isChallengeComplete } from './scoring.js';

/** Each habit and the rule a day must pass to keep its streak. */
export const HABITS = Object.freeze([
  { id: 'smoking', label: 'Smoking ≤ 1', icon: '🚭', isMet: (entry) => Number.isInteger(entry?.cigarettes) && entry.cigarettes <= SMOKING_STREAK_MAX },
  { id: 'drinking', label: 'No drinks', icon: '🚫', isMet: (entry) => Number.isInteger(entry?.drinks) && entry.drinks <= DRINKING_STREAK_MAX },
  { id: 'workout', label: 'Workout', icon: '💪', isMet: (entry) => entry?.workout === true },
  { id: 'food', label: 'Ate enough', icon: '🍽️', isMet: (entry) => entry?.food === true },
  { id: 'water', label: 'Water', icon: '💧', isMet: (entry) => entry?.water === true },
  { id: 'sleep', label: 'Sleep 7h+', icon: '😴', isMet: (entry) => entry?.sleep === true },
  { id: 'challenge', label: 'New / feared thing', icon: '🔥', isMet: (entry) => isChallengeComplete(entry) },
  { id: 'noFap', label: 'No fap', icon: '🧘', isMet: (entry) => entry?.noFap === true },
]);

function challengeDatesUpTo(settings, today) {
  return listDates(settings.startDate, settings.endDate).filter((date) => date <= today);
}

/**
 * Current streak for a habit, counting back from today.
 * If today has not been logged yet, counting starts from yesterday,
 * so an unfilled morning does not show a broken streak.
 * @returns {number}
 */
export function currentStreak(habit, settings, entries, today) {
  const dates = challengeDatesUpTo(settings, today);
  if (dates.length > 0 && dates[dates.length - 1] === today && !entries[today]) dates.pop();

  let streak = 0;
  for (let index = dates.length - 1; index >= 0 && habit.isMet(entries[dates[index]]); index -= 1) {
    streak += 1;
  }
  return streak;
}

/**
 * Longest run of days meeting the habit so far.
 * @returns {number}
 */
export function bestStreak(habit, settings, entries, today) {
  let best = 0;
  let run = 0;
  for (const date of challengeDatesUpTo(settings, today)) {
    run = habit.isMet(entries[date]) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Whether a full week counts as perfect: every day smoking ≤ 1, no drinks,
 * ate enough and a described new/feared thing, plus the weekly workout goal.
 * @returns {boolean}
 */
export function isPerfectWeek(week, entries, settings) {
  if (!week.isFullWeek) return false;
  const isEveryDayClean = week.dates.every((date) => {
    const entry = entries[date];
    return ['smoking', 'drinking', 'food', 'challenge'].every((id) => HABITS.find((habit) => habit.id === id).isMet(entry));
  });
  return isEveryDayClean && countWorkouts(week.dates, entries) >= settings.workoutDaysPerWeek;
}

/**
 * Number of finished full weeks that were perfect.
 * @returns {number}
 */
export function countPerfectWeeks(settings, entries, today) {
  return challengeWeeks(settings.startDate, settings.endDate)
    .filter((week) => week.lastDate <= today)
    .filter((week) => isPerfectWeek(week, entries, settings)).length;
}

/**
 * Streak badges earned per habit, based on the best streak.
 * @returns {{ habit: object, best: number, current: number, milestones: { days: number, isEarned: boolean }[] }[]}
 */
export function streakSummary(settings, entries, today) {
  return HABITS.map((habit) => {
    const best = bestStreak(habit, settings, entries, today);
    return {
      habit,
      best,
      current: currentStreak(habit, settings, entries, today),
      milestones: STREAK_MILESTONES.map((days) => ({ days, isEarned: best >= days })),
    };
  });
}
