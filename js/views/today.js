/**
 * Today screen: the daily checklist, score, workout ring, weigh-in and streak chips.
 */

import { createEmptyEntry } from '../backup.js';
import { ALLOWED_PER_DAY, CHALLENGE_NOTE_MAX_LENGTH, MAX_DAILY_COUNT, WEIGH_IN_DAY_OF_WEEK } from '../config.js';
import { addDays, challengeWeeks, clampDate, dayOfWeek, daysBetween, findWeekContaining } from '../dates.js';
import { byId, el, formatDate, formatSigned, readOptionalNumber, showToast } from '../dom.js';
import { buildDailySeries, countWorkouts, isChallengeComplete, maxDailyPoints, scoreLimitedHabit } from '../scoring.js';
import { streakSummary } from '../streaks.js';
import { validateWeight } from '../validation.js';

const NOTE_SAVE_DELAY_MS = 500;
const RING_RADIUS = 27;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SIMPLE_TOGGLES = ['workout', 'food', 'water', 'sleep'];

/**
 * Creates the Today view.
 * @param {{ getData: () => object, getToday: () => string, save: (mutate: (data: object) => void, message?: string) => Promise<void> }} app
 * @returns {{ render: () => void, showDate: (isoDate: string) => void }}
 */
export function createTodayView(app) {
  let viewDate = null;
  let pendingNote = null;

  const noteInput = byId('challenge-note');
  const weighInInput = byId('weigh-in-input');

  function selectableRange() {
    const { settings } = app.getData();
    return { min: settings.startDate, max: clampDate(app.getToday(), settings.startDate, settings.endDate) };
  }

  function updateEntry(date, change, message) {
    return app.save((data) => {
      const entry = data.entries[date] ?? createEmptyEntry();
      change(entry);
      data.entries[date] = entry;
    }, message);
  }

  function flushPendingNote() {
    if (!pendingNote) return;
    clearTimeout(pendingNote.timer);
    const { date, text } = pendingNote;
    pendingNote = null;
    updateEntry(date, (entry) => { entry.challengeNote = text; });
  }

  function showDate(isoDate) {
    flushPendingNote();
    const { min, max } = selectableRange();
    viewDate = clampDate(isoDate, min, max);
    render();
  }

  function bindEvents() {
    document.querySelectorAll('#view-today [data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const { field } = button.dataset;
        const step = Number(button.dataset.step);
        updateEntry(viewDate, (entry) => {
          entry[field] = Math.min(Math.max(entry[field] + step, 0), MAX_DAILY_COUNT);
        });
      });
    });

    document.querySelectorAll('#view-today .toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const { field } = button.dataset;
        if (field === 'challengeDone') flushPendingNote();
        updateEntry(viewDate, (entry) => { entry[field] = !entry[field]; });
      });
    });

    noteInput.addEventListener('input', () => {
      const text = noteInput.value.slice(0, CHALLENGE_NOTE_MAX_LENGTH);
      byId('challenge-note-count').textContent = `${text.length}/${CHALLENGE_NOTE_MAX_LENGTH}`;
      clearTimeout(pendingNote?.timer);
      pendingNote = { date: viewDate, text, timer: setTimeout(flushPendingNote, NOTE_SAVE_DELAY_MS) };
    });
    noteInput.addEventListener('blur', flushPendingNote);

    byId('day-prev').addEventListener('click', () => showDate(addDays(viewDate, -1)));
    byId('day-next').addEventListener('click', () => showDate(addDays(viewDate, 1)));
    byId('day-input').addEventListener('change', (event) => {
      if (event.target.value) showDate(event.target.value);
    });

    byId('weigh-in-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const weightKg = readOptionalNumber(weighInInput);
      const errors = validateWeight(weightKg);
      if (errors.length > 0) {
        showToast(errors[0], 'error');
        return;
      }
      const date = viewDate;
      weighInInput.blur();
      app.save((data) => { data.weights[date] = Math.round(weightKg * 10) / 10; }, 'Weight saved');
    });
    byId('weigh-in-remove').addEventListener('click', () => {
      const date = viewDate;
      app.save((data) => { delete data.weights[date]; }, 'Weigh-in removed');
    });

    byId('mark-logged').addEventListener('click', () => updateEntry(viewDate, () => {}, 'Day logged'));
    byId('clear-day').addEventListener('click', () => {
      if (!confirm(`Clear everything logged for ${formatDate(viewDate)}?`)) return;
      flushPendingNote();
      const date = viewDate;
      app.save((data) => { delete data.entries[date]; }, 'Day cleared');
    });
  }

  function renderCountdown(today, settings) {
    const daysLeft = daysBetween(today, settings.startDate);
    byId('countdown-days').textContent = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
    byId('countdown-label').textContent = `Day 1 is ${formatDate(settings.startDate)}. Logging opens then.`;
  }

  function limitedHint(count, rules) {
    const current = scoreLimitedHabit(count, rules);
    // Non-breaking spaces keep each "count → points" pair on one line.
    const rule = [`0\u00a0→\u00a0${formatSigned(rules.zero)}`, `${ALLOWED_PER_DAY}\u00a0→\u00a0${formatSigned(rules.one)}`, `extra\u00a0${formatSigned(-rules.extraPenalty)}\u00a0each`].join(' · ');
    return `${formatSigned(current)} pts\n${rule}`;
  }

  function renderChecklist(entry, points) {
    const values = entry ?? createEmptyEntry();
    byId('count-cigarettes').textContent = String(values.cigarettes);
    byId('count-drinks').textContent = String(values.drinks);
    byId('hint-cigarettes').textContent = limitedHint(values.cigarettes, { zero: points.smokingZero, one: points.smokingOne, extraPenalty: points.smokingExtraPenalty });
    byId('hint-drinks').textContent = limitedHint(values.drinks, { zero: points.drinkingZero, one: points.drinkingOne, extraPenalty: points.drinkingExtraPenalty });

    document.querySelectorAll('#view-today .toggle').forEach((button) => {
      button.setAttribute('aria-pressed', String(values[button.dataset.field]));
    });
    SIMPLE_TOGGLES.forEach((field) => { byId(`hint-${field}`).textContent = `${formatSigned(points[field])} pts`; });

    const isMissingNote = values.challengeDone && !isChallengeComplete(values);
    const challengeHint = byId('hint-challenge');
    challengeHint.textContent = isMissingNote ? `Write what it was to earn ${formatSigned(points.challenge)}` : `${formatSigned(points.challenge)} pts`;
    challengeHint.classList.toggle('warning-text', isMissingNote);

    byId('challenge-note-wrap').hidden = !values.challengeDone;
    if (document.activeElement !== noteInput && !pendingNote) {
      noteInput.value = values.challengeNote;
      byId('challenge-note-count').textContent = `${values.challengeNote.length}/${CHALLENGE_NOTE_MAX_LENGTH}`;
    }
  }

  function renderScore(data, today) {
    const day = buildDailySeries(data.settings, data.entries, today).find((item) => item.date === viewDate);
    const dayNumber = daysBetween(data.settings.startDate, viewDate) + 1;
    const totalDays = daysBetween(data.settings.startDate, data.settings.endDate) + 1;
    byId('day-number').textContent = `Day ${dayNumber} of ${totalDays}`;
    byId('day-score').textContent = formatSigned(day?.total ?? 0);
    byId('day-max').textContent = ` / ${maxDailyPoints(data.settings.points)}`;

    const status = byId('day-status');
    const bonusNote = day?.weeklyAdjustment ? ` · weekly workout ${formatSigned(day.weeklyAdjustment)}` : '';
    status.textContent = data.entries[viewDate] ? `Logged${bonusNote}` : `Not logged${bonusNote}`;
    status.dataset.state = data.entries[viewDate] ? 'logged' : 'missing';
  }

  function renderWorkoutRing(data) {
    const week = findWeekContaining(challengeWeeks(data.settings.startDate, data.settings.endDate), viewDate);
    const target = data.settings.workoutDaysPerWeek;
    const count = countWorkouts(week.dates, data.entries);
    const ring = byId('workout-ring');
    const fill = byId('workout-ring-fill');
    fill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    fill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - Math.min(count / target, 1)));
    ring.dataset.complete = String(count >= target);
    byId('workout-ring-count').textContent = week.isFullWeek ? `${count}/${target}` : String(count);
    ring.setAttribute('aria-label', week.isFullWeek
      ? `${count} of ${target} workouts this week`
      : `${count} workouts this short week (no weekly goal)`);
  }

  function renderWeighIn(data) {
    const isWeighInDay = dayOfWeek(viewDate) === WEIGH_IN_DAY_OF_WEEK;
    const savedWeight = data.weights[viewDate];
    byId('weigh-in-card').classList.toggle('highlight', isWeighInDay && savedWeight === undefined);
    byId('weigh-in-title').textContent = isWeighInDay ? 'Monday weigh-in' : 'Weight (optional)';
    byId('weigh-in-remove').hidden = savedWeight === undefined;
    if (document.activeElement !== weighInInput) weighInInput.value = savedWeight ?? '';
  }

  function renderStreakChips(data, today) {
    const chips = streakSummary(data.settings, data.entries, today).map(({ habit, current }) =>
      el('span', { className: `chip${current > 0 ? ' active' : ''}`, attrs: { title: `${habit.label}: ${current}-day streak` } }, [
        el('span', { text: habit.icon, attrs: { 'aria-hidden': 'true' } }),
        ` ${habit.label} `,
        el('strong', { text: `${current}d` }),
      ]));
    byId('streak-chips').replaceChildren(...chips);
  }

  /** Re-renders the view from current data. */
  function render() {
    const data = app.getData();
    const today = app.getToday();
    const hasStarted = today >= data.settings.startDate;
    byId('today-not-started').hidden = hasStarted;
    byId('today-tracker').hidden = !hasStarted;
    if (!hasStarted) {
      renderCountdown(today, data.settings);
      return;
    }

    const { min, max } = selectableRange();
    viewDate = clampDate(viewDate ?? max, min, max);
    const dateInput = byId('day-input');
    dateInput.min = min;
    dateInput.max = max;
    dateInput.value = viewDate;
    byId('day-label').textContent = viewDate === today ? `Today · ${formatDate(viewDate)}` : formatDate(viewDate);
    byId('day-prev').disabled = viewDate <= min;
    byId('day-next').disabled = viewDate >= max;

    const entry = data.entries[viewDate];
    renderScore(data, today);
    renderWorkoutRing(data);
    renderChecklist(entry, data.settings.points);
    renderWeighIn(data);
    byId('mark-logged').hidden = Boolean(entry);
    byId('clear-day').hidden = !entry;
    renderStreakChips(data, today);
  }

  bindEvents();
  return { render, showDate };
}
