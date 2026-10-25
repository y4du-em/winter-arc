/**
 * Progress screen: summary stats, points charts, 100-day map, streaks, badges and fears faced.
 */

import { renderDailyPointsChart, renderRunningTotalChart } from '../charts.js';
import { byId, el, formatDate, formatSigned, statTile } from '../dom.js';
import { renderHeatmap } from '../heatmap.js';
import { buildDailySeries, isChallengeComplete, maxDailyPoints } from '../scoring.js';
import { countPerfectWeeks, streakSummary } from '../streaks.js';

function renderStats(series, perfectWeeks) {
  const logged = series.filter((day) => day.isLogged);
  const total = series.at(-1)?.cumulative ?? 0;
  const average = logged.length > 0 ? Math.round(logged.reduce((sum, day) => sum + day.dayPoints, 0) / logged.length) : 0;
  const bestDay = series.reduce((best, day) => (best === null || day.total > best.total ? day : best), null);
  byId('progress-stats').replaceChildren(
    statTile('Total points', formatSigned(total)),
    statTile('Days logged', `${logged.length}/${series.length}`),
    statTile('Avg / logged day', formatSigned(average)),
    statTile('Perfect weeks', String(perfectWeeks), bestDay ? `Best day: ${formatSigned(bestDay.total)}` : undefined),
  );
}

function renderStreakTable(summary) {
  const rows = summary.map(({ habit, current, best }) => el('tr', {}, [
    el('th', { attrs: { scope: 'row' } }, [el('span', { text: habit.icon, attrs: { 'aria-hidden': 'true' } }), ` ${habit.label}`]),
    el('td', { text: `${current}d` }),
    el('td', { text: `${best}d` }),
  ]));
  byId('streak-table').tBodies[0].replaceChildren(...rows);
}

function renderBadges(summary, perfectWeeks) {
  const habitRows = summary.map(({ habit, milestones }) => el('div', { className: 'badge-row' }, [
    el('p', { className: 'badge-habit' }, [el('span', { text: habit.icon, attrs: { 'aria-hidden': 'true' } }), ` ${habit.label}`]),
    el('div', { className: 'badges' }, milestones.map(({ days, isEarned }) => el('span', {
      className: `badge${isEarned ? ' earned' : ''}`,
      text: `${days}`,
      attrs: { title: `${days}-day streak ${isEarned ? 'earned' : 'not earned yet'}`, 'aria-label': `${days}-day streak, ${isEarned ? 'earned' : 'locked'}` },
    }))),
  ]));
  const perfectRow = el('div', { className: 'badge-row' }, [
    el('p', { className: 'badge-habit', text: '⭐ Perfect weeks' }),
    el('span', { className: `badge wide${perfectWeeks > 0 ? ' earned' : ''}`, text: `× ${perfectWeeks}` }),
  ]);
  byId('badge-list').replaceChildren(...habitRows, perfectRow);
}

function renderFears(data, series) {
  const challengeDates = new Set(series.map((day) => day.date));
  const fears = Object.entries(data.entries)
    .filter(([date, entry]) => challengeDates.has(date) && isChallengeComplete(entry))
    .sort(([first], [second]) => second.localeCompare(first));
  byId('fears-count').textContent = String(fears.length);
  byId('fears-empty').hidden = fears.length > 0;
  byId('fears-list').replaceChildren(...fears.map(([date, entry]) => el('li', {}, [
    el('time', { className: 'muted small', text: formatDate(date), attrs: { datetime: date } }),
    el('p', { text: entry.challengeNote.trim() }),
  ])));
}

/**
 * Creates the Progress view.
 * @param {{ getData: () => object, getToday: () => string, openDay: (date: string) => void }} app
 * @returns {{ render: () => void }}
 */
export function createProgressView(app) {
  /** Re-renders the view from current data. */
  function render() {
    const data = app.getData();
    const today = app.getToday();
    const series = buildDailySeries(data.settings, data.entries, today);
    const summary = streakSummary(data.settings, data.entries, today);
    const perfectWeeks = countPerfectWeeks(data.settings, data.entries, today);

    renderStats(series, perfectWeeks);
    byId('chart-empty').hidden = series.length > 0;
    renderDailyPointsChart(byId('chart-daily'), series);
    renderRunningTotalChart(byId('chart-total'), series);
    renderHeatmap(byId('heatmap'), byId('heatmap-legend'), {
      settings: data.settings,
      series,
      maxPoints: maxDailyPoints(data.settings.points),
      onSelect: app.openDay,
    });
    renderStreakTable(summary);
    renderBadges(summary, perfectWeeks);
    renderFears(data, series);
  }

  return { render };
}
