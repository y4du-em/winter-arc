/**
 * Settings screen: challenge dates, body measures, point values, backup and restore.
 */

import { parseBackupText } from '../backup.js';
import { DEFAULT_SETTINGS } from '../config.js';
import { byId, el, formatDate, readOptionalNumber, showToast } from '../dom.js';
import { downloadBackup } from '../storage.js';
import { validateSettings } from '../validation.js';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const POINT_FIELDS = [
  { key: 'smokingZero', label: '0 cigarettes (+)' },
  { key: 'smokingOne', label: '1 cigarette (+)' },
  { key: 'smokingExtraPenalty', label: 'Each extra cigarette (−)' },
  { key: 'drinkingZero', label: '0 drinks (+)' },
  { key: 'drinkingOne', label: '1 drink (+)' },
  { key: 'drinkingExtraPenalty', label: 'Each extra drink (−)' },
  { key: 'workout', label: 'Workout (+)' },
  { key: 'food', label: 'Ate enough (+)' },
  { key: 'water', label: 'Water (+)' },
  { key: 'sleep', label: 'Sleep (+)' },
  { key: 'challenge', label: 'New / feared thing (+)' },
  { key: 'noFap', label: 'No fap (+)' },
  { key: 'weeklyWorkoutBonus', label: 'Weekly workout goal met (+)' },
  { key: 'weeklyWorkoutPenalty', label: 'Weekly workout goal missed (−)' },
];

const PERSIST_STATUS_TEXT = {
  granted: 'Yes, the browser won\'t auto-delete it',
  denied: 'Not granted, so back up often (installing the app usually helps)',
  unsupported: 'Not supported by this browser, so back up often',
};

/**
 * Creates the Settings view.
 * @param {{ getData: () => object, getPersistStatus: () => string, save: (mutate: (data: object) => void, message?: string) => Promise<void>, replaceData: (data: object) => Promise<void> }} app
 * @returns {{ render: () => void }}
 */
export function createSettingsView(app) {
  const form = byId('settings-form');
  let isDirty = false;

  byId('points-fields').replaceChildren(...POINT_FIELDS.map(({ key, label }) =>
    el('label', {}, [label, el('input', { attrs: { type: 'number', name: `points.${key}`, min: '0', step: '1', inputmode: 'numeric', required: '' } })])));

  function fillForm(settings) {
    form.elements.startDate.value = settings.startDate;
    form.elements.endDate.value = settings.endDate;
    form.elements.heightCm.value = settings.heightCm ?? '';
    form.elements.goalWeightKg.value = settings.goalWeightKg ?? '';
    form.elements.workoutDaysPerWeek.value = settings.workoutDaysPerWeek;
    POINT_FIELDS.forEach(({ key }) => { form.elements[`points.${key}`].value = settings.points[key]; });
  }

  function readForm(current) {
    return {
      ...current,
      startDate: form.elements.startDate.value,
      endDate: form.elements.endDate.value,
      heightCm: readOptionalNumber(form.elements.heightCm),
      goalWeightKg: readOptionalNumber(form.elements.goalWeightKg),
      workoutDaysPerWeek: readOptionalNumber(form.elements.workoutDaysPerWeek),
      points: Object.fromEntries(POINT_FIELDS.map(({ key }) => [key, readOptionalNumber(form.elements[`points.${key}`])])),
    };
  }

  function showErrors(errors) {
    const list = byId('settings-errors');
    list.hidden = errors.length === 0;
    list.replaceChildren(...errors.map((message) => el('li', { text: message })));
  }

  form.addEventListener('input', () => { isDirty = true; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const next = readForm(app.getData().settings);
    const errors = validateSettings(next);
    showErrors(errors);
    if (errors.length > 0) return;
    isDirty = false;
    await app.save((data) => { data.settings = next; }, 'Settings saved');
  });

  byId('reset-points').addEventListener('click', () => {
    POINT_FIELDS.forEach(({ key }) => { form.elements[`points.${key}`].value = DEFAULT_SETTINGS.points[key]; });
    isDirty = true;
    showToast('Default points filled in. Tap Save to apply.');
  });

  byId('export-button').addEventListener('click', async () => {
    const now = new Date();
    await app.save((data) => { data.meta.lastBackupAt = now.toISOString(); });
    downloadBackup(app.getData(), now);
    showToast('Backup downloaded. Keep the file somewhere safe.');
  });

  byId('import-input').addEventListener('change', async (event) => {
    const input = event.target;
    const [file] = input.files;
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('That file is too large to be a Winter Arc backup.', 'error');
      return;
    }

    let text;
    try {
      text = await file.text();
    } catch (error) {
      console.error(`Could not read backup file "${file.name}"`, error);
      showToast(`Couldn't read "${file.name}". Try choosing it again.`, 'error');
      return;
    }
    const result = parseBackupText(text);
    if (!result.isValid) {
      console.error('Backup import rejected', result.errors);
      showToast(`Can't import: ${result.errors[0]}`, 'error');
      return;
    }
    const entryCount = Object.keys(result.data.entries).length;
    if (!confirm(`Replace ALL current data with this backup (${entryCount} logged days)? This cannot be undone.`)) return;
    isDirty = false;
    await app.replaceData(result.data);
  });

  /** Re-renders the view from current data. */
  function render() {
    const { settings, meta } = app.getData();
    if (!isDirty) {
      fillForm(settings);
      showErrors([]);
    }
    byId('last-backup').textContent = meta.lastBackupAt ? formatDate(meta.lastBackupAt.slice(0, 10)) : 'Never';
    byId('persist-status').textContent = PERSIST_STATUS_TEXT[app.getPersistStatus()] ?? 'Checking…';
  }

  return { render };
}
