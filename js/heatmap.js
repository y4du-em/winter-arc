/**
 * The 100-day map: one square per challenge day, colored by score (overview)
 * or by whether one habit was kept or broken.
 */

import { DAY_STATUS, countLabel, dayStatus } from './habit-status.js';
import { listDates } from './dates.js';
import { el, formatDate, formatSigned } from './dom.js';

const SCORE_LEVELS = [
  { level: 'full', label: 'Perfect', minShare: 1 },
  { level: 'high', label: '70%+', minShare: 0.7 },
  { level: 'mid', label: '40%+', minShare: 0.4 },
  { level: 'low', label: 'Some', minShare: Number.MIN_VALUE },
];

const LEGEND = [
  { level: 'full', label: 'Perfect' },
  { level: 'high', label: '70%+' },
  { level: 'mid', label: '40%+' },
  { level: 'low', label: 'Some' },
  { level: 'zero', label: '0 or less' },
  { level: 'negative', label: 'Big minus' },
  { level: 'missing', label: 'Not logged' },
];

const HABIT_LEGEND = [
  { level: DAY_STATUS.kept, label: 'Kept' },
  { level: DAY_STATUS.broken, label: 'Broken' },
  { level: DAY_STATUS.missing, label: 'Not logged' },
];

const HABIT_STATUS_TEXT = {
  [DAY_STATUS.kept]: 'kept',
  [DAY_STATUS.broken]: 'broken',
  [DAY_STATUS.missing]: 'not logged',
};

const BIG_MINUS_THRESHOLD = -10;

/**
 * Picks the color level of one day.
 * @param {{ isLogged: boolean, total: number }|undefined} day Undefined for future days.
 * @param {number} maxPoints
 * @returns {string}
 */
export function heatLevel(day, maxPoints) {
  if (!day) return 'future';
  if (!day.isLogged && day.total === 0) return 'missing';
  if (day.total <= BIG_MINUS_THRESHOLD) return 'negative';
  if (day.total <= 0) return 'zero';
  const share = day.total / maxPoints;
  return SCORE_LEVELS.find((item) => share >= item.minShare).level;
}

/**
 * Picks the color level of one day for a single habit.
 * @param {string} habitId
 * @param {object|undefined} entry The day's entry, or undefined if not logged.
 * @param {boolean} isUpcoming True for days after today.
 * @returns {'future'|'kept'|'broken'|'missing'}
 */
export function habitHeatLevel(habitId, entry, isUpcoming) {
  return isUpcoming ? 'future' : dayStatus(habitId, entry);
}

function describeScoreDay(day) {
  return day.isLogged ? `${formatSigned(day.total)} points` : 'not logged';
}

function describeHabitDay(habitId, entry, level) {
  return [HABIT_STATUS_TEXT[level], countLabel(habitId, entry)].filter(Boolean).join(', ');
}

/**
 * Draws the map and its legend.
 * @param {HTMLElement} container
 * @param {HTMLElement} legendContainer
 * @param {{ settings: object, entries: object, series: object[], maxPoints: number, habitId: string|null, onSelect: (date: string) => void }} options
 *   habitId null colors by daily score; a habit id colors by kept / broken.
 */
export function renderHeatmap(container, legendContainer, { settings, entries, series, maxPoints, habitId, onSelect }) {
  const byDate = new Map(series.map((day) => [day.date, day]));
  const cells = listDates(settings.startDate, settings.endDate).map((date, index) => {
    const day = byDate.get(date);
    const isUpcoming = !day;
    const level = habitId ? habitHeatLevel(habitId, entries[date], isUpcoming) : heatLevel(day, maxPoints);
    let detail = 'upcoming';
    if (!isUpcoming) detail = habitId ? describeHabitDay(habitId, entries[date], level) : describeScoreDay(day);
    const description = `Day ${index + 1}, ${formatDate(date)}: ${detail}`;
    return el('button', {
      className: 'heat-cell',
      text: String(index + 1),
      attrs: { 'data-level': level, title: description, 'aria-label': description, ...(isUpcoming ? { disabled: '' } : {}) },
      on: { click: () => onSelect(date) },
    });
  });
  container.replaceChildren(...cells);

  legendContainer.replaceChildren(...(habitId ? HABIT_LEGEND : LEGEND).map(({ level, label }) =>
    el('span', { className: 'legend-item' }, [el('span', { className: 'heat-swatch', attrs: { 'data-level': level } }), label])));
}
