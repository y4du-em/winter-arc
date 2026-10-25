/**
 * Weight screen: stats, goal progress, trend chart, add form and history table.
 */

import { renderWeightChart } from '../charts.js';
import { byId, el, formatDate, formatKg, readOptionalNumber, showToast, statTile } from '../dom.js';
import { validateWeight } from '../validation.js';
import { summarizeWeights } from '../weight-stats.js';

const PERCENT = 100;

function formatSignedKg(value) {
  if (value === 0) return '0.0 kg';
  return `${value > 0 ? '+' : '−'}${formatKg(Math.abs(value))}`;
}

/**
 * Creates the Weight view.
 * @param {{ getData: () => object, getToday: () => string, save: (mutate: (data: object) => void, message?: string) => Promise<void> }} app
 * @returns {{ render: () => void }}
 */
export function createWeightView(app) {
  const dateInput = byId('weight-date');
  const valueInput = byId('weight-value');

  byId('weight-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const date = dateInput.value;
    const weightKg = readOptionalNumber(valueInput);
    const errors = validateWeight(weightKg);
    if (!date || date > app.getToday()) {
      showToast('Pick today or a past date.', 'error');
      return;
    }
    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }
    valueInput.value = '';
    app.save((data) => { data.weights[date] = Math.round(weightKg * 10) / 10; }, 'Weight saved');
  });

  function deleteWeighIn(date) {
    if (!confirm(`Delete the weigh-in from ${formatDate(date)}?`)) return;
    app.save((data) => { delete data.weights[date]; }, 'Weigh-in deleted');
  }

  function renderStats(summary, settings) {
    const goal = settings.goalWeightKg;
    byId('weight-stats').replaceChildren(
      statTile('Start', summary.start === null ? '—' : formatKg(summary.start)),
      statTile('Latest', summary.latest === null ? '—' : formatKg(summary.latest)),
      statTile('Change', summary.change === null ? '—' : formatSignedKg(summary.change)),
      statTile('Goal', goal === null ? '—' : formatKg(goal), settings.heightCm === null ? 'Set height & goal in Settings' : `Height ${settings.heightCm} cm`),
    );
  }

  function renderGoal(summary, goal) {
    const card = byId('goal-card');
    card.hidden = goal === null || summary.goalShare === null;
    if (card.hidden) return;
    const percent = Math.round(summary.goalShare * PERCENT);
    byId('goal-progress').setAttribute('aria-valuenow', String(percent));
    byId('goal-progress-fill').style.width = `${percent}%`;
    byId('goal-progress-label').textContent = summary.remaining === 0
      ? `${percent}% · goal reached 🎉`
      : `${percent}% · ${formatKg(Math.abs(summary.remaining))} to go`;
  }

  function renderTable(weighIns) {
    const rows = weighIns.slice().reverse().map(([date, weight], index, reversed) => {
      const previous = reversed[index + 1]?.[1];
      return el('tr', {}, [
        el('th', { text: formatDate(date), attrs: { scope: 'row' } }),
        el('td', { text: formatKg(weight) }),
        el('td', { className: 'muted', text: previous === undefined ? '—' : formatSignedKg(Math.round((weight - previous) * 10) / 10) }),
        el('td', {}, [el('button', {
          className: 'icon-button small',
          text: '✕',
          attrs: { 'aria-label': `Delete weigh-in from ${formatDate(date)}` },
          on: { click: () => deleteWeighIn(date) },
        })]),
      ]);
    });
    byId('weight-table').tBodies[0].replaceChildren(...rows);
  }

  /** Re-renders the view from current data. */
  function render() {
    const { settings, weights } = app.getData();
    const summary = summarizeWeights(weights, settings.goalWeightKg);
    const today = app.getToday();

    renderStats(summary, settings);
    renderGoal(summary, settings.goalWeightKg);
    byId('weight-empty').hidden = summary.weighIns.length > 0;
    byId('chart-weight').hidden = summary.weighIns.length === 0;
    renderWeightChart(byId('chart-weight'), summary.weighIns, settings.goalWeightKg);
    renderTable(summary.weighIns);

    dateInput.max = today;
    if (!dateInput.value) dateInput.value = today;
  }

  return { render };
}
