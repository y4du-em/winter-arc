/**
 * Chart.js wrappers. Chart.js is loaded globally from vendor/chart.umd.min.js.
 * Colors come from CSS custom properties so the charts follow the theme.
 */

import { formatDate, formatKg, formatShortDate, formatSigned } from './dom.js';

const chartInstances = new Map();
const MAX_X_TICKS = 8;
const BAR_RADIUS = 4;
const MAX_BAR_THICKNESS = 14;
const LINE_WIDTH = 2;
const MARKER_RADIUS = 4;
const HOVER_RADIUS = 6;
const GOAL_DASH = [6, 4];

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function baseOptions() {
  const muted = cssVar('--text-muted');
  const grid = cssVar('--grid');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--surface-raised'),
        titleColor: cssVar('--text'),
        bodyColor: cssVar('--text'),
        borderColor: grid,
        borderWidth: 1,
        displayColors: false,
        padding: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { color: grid }, ticks: { color: muted, autoSkip: true, maxTicksLimit: MAX_X_TICKS, maxRotation: 0 } },
      y: { grid: { color: grid }, border: { display: false }, ticks: { color: muted, precision: 0 } },
    },
  };
}

function renderChart(canvas, config) {
  chartInstances.get(canvas.id)?.destroy();
  if (typeof Chart === 'undefined') {
    console.error('Chart.js failed to load; charts are unavailable.');
    return;
  }
  chartInstances.set(canvas.id, new Chart(canvas, config));
}

function dayTitle(series) {
  return (items) => {
    const day = series[items[0].dataIndex];
    return `Day ${day.dayNumber} · ${formatDate(day.date)}`;
  };
}

/**
 * Bar chart of each day's points: positive days in blue, negative in red.
 * @param {HTMLCanvasElement} canvas
 * @param {ReturnType<import('./scoring.js').buildDailySeries>} series
 */
export function renderDailyPointsChart(canvas, series) {
  const positive = cssVar('--positive');
  const negative = cssVar('--negative');
  const options = baseOptions();
  options.plugins.tooltip.callbacks = {
    title: dayTitle(series),
    label: (item) => {
      const day = series[item.dataIndex];
      return day.isLogged || day.weeklyAdjustment ? `${formatSigned(day.total)} pts` : 'Not logged';
    },
    afterLabel: (item) => {
      const { weeklyAdjustment } = series[item.dataIndex];
      return weeklyAdjustment ? `incl. weekly workout ${formatSigned(weeklyAdjustment)}` : '';
    },
  };
  renderChart(canvas, {
    type: 'bar',
    data: {
      labels: series.map((day) => formatShortDate(day.date)),
      datasets: [{
        label: 'Daily points',
        data: series.map((day) => day.total),
        backgroundColor: series.map((day) => (day.total >= 0 ? positive : negative)),
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: MAX_BAR_THICKNESS,
      }],
    },
    options,
  });
}

/**
 * Line chart of the running total of points.
 * @param {HTMLCanvasElement} canvas
 * @param {ReturnType<import('./scoring.js').buildDailySeries>} series
 */
export function renderRunningTotalChart(canvas, series) {
  const options = baseOptions();
  options.plugins.tooltip.callbacks = {
    title: dayTitle(series),
    label: (item) => `Total: ${series[item.dataIndex].cumulative} pts`,
  };
  renderChart(canvas, {
    type: 'line',
    data: {
      labels: series.map((day) => formatShortDate(day.date)),
      datasets: [{
        label: 'Running total',
        data: series.map((day) => day.cumulative),
        borderColor: cssVar('--positive'),
        borderWidth: LINE_WIDTH,
        pointRadius: 0,
        pointHoverRadius: HOVER_RADIUS,
        pointHoverBorderColor: cssVar('--surface'),
        pointHoverBorderWidth: 2,
        tension: 0.25,
      }],
    },
    options,
  });
}

/**
 * Line chart of weigh-ins, with the goal as a dashed reference line when set.
 * @param {HTMLCanvasElement} canvas
 * @param {[string, number][]} weighIns Sorted by date.
 * @param {number|null} goalWeightKg
 */
export function renderWeightChart(canvas, weighIns, goalWeightKg) {
  const options = baseOptions();
  const hasGoal = goalWeightKg !== null;
  options.scales.y.ticks.precision = 1;
  options.plugins.legend = {
    display: hasGoal,
    labels: { color: cssVar('--text-muted'), boxWidth: 16, boxHeight: 2 },
  };
  options.plugins.tooltip.displayColors = hasGoal;
  options.plugins.tooltip.callbacks = {
    title: (items) => formatDate(weighIns[items[0].dataIndex][0]),
    label: (item) => `${item.dataset.label}: ${formatKg(item.parsed.y)}`,
  };

  const datasets = [{
    label: 'Weight',
    data: weighIns.map(([, weight]) => weight),
    borderColor: cssVar('--positive'),
    backgroundColor: cssVar('--positive'),
    borderWidth: LINE_WIDTH,
    pointRadius: MARKER_RADIUS,
    pointHoverRadius: HOVER_RADIUS,
    pointBorderColor: cssVar('--surface'),
    pointBorderWidth: 2,
    tension: 0.2,
  }];
  if (hasGoal) {
    datasets.push({
      label: 'Goal',
      data: weighIns.map(() => goalWeightKg),
      borderColor: cssVar('--text-muted'),
      backgroundColor: cssVar('--text-muted'),
      borderWidth: LINE_WIDTH,
      borderDash: GOAL_DASH,
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  }

  renderChart(canvas, {
    type: 'line',
    data: { labels: weighIns.map(([date]) => formatShortDate(date)), datasets },
    options,
  });
}
