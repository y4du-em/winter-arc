/**
 * "Day by day" card on the Progress screen: every challenge day up to today,
 * numbered, showing whether the picked habit was kept or broken, or an overview.
 */

import {
  DAY_STATUS,
  OVERVIEW_ID,
  buildDayLog,
  buildOverviewLog,
  filterBrokenDays,
  summarizeDayLog,
  summarizeOverview,
} from '../day-log.js';
import { byId, el, formatDate, formatSigned } from '../dom.js';
import { HABITS } from '../streaks.js';

const STATUS_TEXT = {
  [DAY_STATUS.kept]: '✓ Kept',
  [DAY_STATUS.broken]: '✗ Broken',
  [DAY_STATUS.missing]: '○ Not logged',
};

const SUMMARY_SEPARATOR = ' · ';

/** Non-breaking spaces so a summary part like "4 cigarettes total" never wraps mid-way. */
function keepTogether(text) {
  return text.replaceAll(' ', '\u00a0');
}

const EMPTY_TEXT = {
  notStarted: 'The list fills in once the challenge starts.',
  noBrokenDays: 'No broken days. Keep it going!',
};

/**
 * Creates the day-by-day card.
 * @param {{ getData: () => object, getToday: () => string, openDay: (date: string) => void }} app
 * @param {() => string} getSelectedId The habit picked on the 100-day map, or OVERVIEW_ID.
 * @returns {{ render: () => void }}
 */
export function createDayLog(app, getSelectedId) {
  const brokenOnlyInput = byId('day-log-broken-only');
  brokenOnlyInput.addEventListener('change', render);

  function dayButton(row, description, children) {
    return el('li', {}, [el('button', {
      className: 'day-row',
      attrs: { 'aria-label': `Day ${row.dayNumber}, ${formatDate(row.date)}: ${description}. Open this day.` },
      on: { click: () => app.openDay(row.date) },
    }, [
      el('span', { className: 'day-number', text: String(row.dayNumber) }),
      el('span', { className: 'day-date', text: formatDate(row.date) }),
      ...children,
    ])]);
  }

  function habitRow(row) {
    const description = [STATUS_TEXT[row.status], row.count].filter(Boolean).join(', ');
    return dayButton(row, description, [
      el('span', { className: 'day-status', text: STATUS_TEXT[row.status], attrs: { 'data-status': row.status } }),
      el('span', { className: 'day-detail', text: row.count ?? '' }),
    ]);
  }

  function overviewRow(row) {
    const isLogged = row.keptCount !== null;
    const statusText = isLogged ? `${row.keptCount}/${row.habitCount} kept` : STATUS_TEXT[DAY_STATUS.missing];
    return dayButton(row, `${statusText}, ${formatSigned(row.points)} points`, [
      el('span', { className: 'day-status', text: statusText, attrs: { 'data-status': isLogged ? 'logged' : DAY_STATUS.missing } }),
      el('span', { className: 'day-detail', text: `${formatSigned(row.points)} pts` }),
    ]);
  }

  function renderOverview(data, today) {
    const rows = buildOverviewLog(data.settings, data.entries, today);
    const summary = summarizeOverview(rows);
    const parts = [
      `Logged ${summary.logged}`,
      `Not logged ${summary.missing}`,
      ...(summary.averageKept === null ? [] : [`avg ${summary.averageKept}/${summary.habitCount} habits kept`]),
    ];
    return {
      summaryText: rows.length > 0 ? parts.map(keepTogether).join(SUMMARY_SEPARATOR) : '',
      items: rows.map(overviewRow),
      emptyText: EMPTY_TEXT.notStarted,
    };
  }

  function renderHabit(data, today, habitId) {
    const rows = buildDayLog(data.settings, data.entries, today, habitId);
    const summary = summarizeDayLog(habitId, rows, data.entries);
    const parts = [
      `${STATUS_TEXT[DAY_STATUS.kept]} ${summary.kept}`,
      `${STATUS_TEXT[DAY_STATUS.broken]} ${summary.broken}`,
      `${STATUS_TEXT[DAY_STATUS.missing]} ${summary.missing}`,
      ...(summary.total ? [`${summary.total} total`] : []),
    ];
    const visibleRows = brokenOnlyInput.checked ? filterBrokenDays(rows) : rows;
    return {
      summaryText: rows.length > 0 ? parts.map(keepTogether).join(SUMMARY_SEPARATOR) : '',
      items: visibleRows.map(habitRow),
      emptyText: rows.length > 0 ? EMPTY_TEXT.noBrokenDays : EMPTY_TEXT.notStarted,
    };
  }

  /** Re-renders the card from current data and the picked habit. */
  function render() {
    const data = app.getData();
    const today = app.getToday();
    const selectedId = getSelectedId();
    const isOverview = selectedId === OVERVIEW_ID;
    // "Only broken" isn't offered in Overview: rest days would make almost every day count as broken.
    byId('day-log-broken-only-wrap').hidden = isOverview;
    const habit = HABITS.find((candidate) => candidate.id === selectedId);
    byId('day-log-habit-name').textContent = isOverview ? '📋 Overview' : `${habit.icon} ${habit.label}`;

    const { summaryText, items, emptyText } = isOverview ? renderOverview(data, today) : renderHabit(data, today, selectedId);
    byId('day-log-summary').textContent = summaryText;
    byId('day-log-list').replaceChildren(...items);
    const empty = byId('day-log-empty');
    empty.hidden = items.length > 0;
    empty.textContent = emptyText;
  }

  return { render };
}
