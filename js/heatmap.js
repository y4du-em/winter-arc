/**
 * The 100-day map: one square per challenge day, colored by score.
 */

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
 * Draws the map and its legend.
 * @param {HTMLElement} container
 * @param {HTMLElement} legendContainer
 * @param {{ settings: object, series: object[], maxPoints: number, onSelect: (date: string) => void }} options
 */
export function renderHeatmap(container, legendContainer, { settings, series, maxPoints, onSelect }) {
  const byDate = new Map(series.map((day) => [day.date, day]));
  const cells = listDates(settings.startDate, settings.endDate).map((date, index) => {
    const day = byDate.get(date);
    const level = heatLevel(day, maxPoints);
    const description = day
      ? `Day ${index + 1}, ${formatDate(date)}: ${day.isLogged ? `${formatSigned(day.total)} points` : 'not logged'}`
      : `Day ${index + 1}, ${formatDate(date)}: upcoming`;
    return el('button', {
      className: 'heat-cell',
      text: String(index + 1),
      attrs: { 'data-level': level, title: description, 'aria-label': description, ...(day ? {} : { disabled: '' }) },
      on: { click: () => onSelect(date) },
    });
  });
  container.replaceChildren(...cells);

  legendContainer.replaceChildren(...LEGEND.map(({ level, label }) =>
    el('span', { className: 'legend-item' }, [el('span', { className: 'heat-swatch', attrs: { 'data-level': level } }), label])));
}
