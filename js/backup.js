/**
 * Pure helpers for the app's data document: creating it, checking backup files,
 * and deciding when to remind about backups.
 */

import { BACKUP_REMINDER_DAYS, DATA_VERSION, createDefaultSettings } from './config.js';
import { daysBetween, toLocalISODate } from './dates.js';
import { validateDateMap, validateEntry, validateSettings, validateWeight } from './validation.js';

/**
 * A daily entry with nothing smoked, nothing drunk and nothing ticked.
 * @returns {object}
 */
export function createEmptyEntry() {
  return {
    cigarettes: 0,
    drinks: 0,
    workout: false,
    food: false,
    water: false,
    sleep: false,
    noFap: false,
    screenTime: false,
  };
}

/**
 * A brand-new, empty data document.
 * @param {Date} now
 * @returns {object}
 */
export function createEmptyData(now) {
  const timestamp = now.toISOString();
  return {
    version: DATA_VERSION,
    settings: createDefaultSettings(),
    entries: {},
    weights: {},
    meta: { createdAt: timestamp, updatedAt: timestamp, lastBackupAt: null },
  };
}

/** Entry fields added after the first release, with the value old entries get. */
const ENTRY_FIELDS_ADDED_LATER = Object.freeze({ noFap: false, screenTime: false });

/** Data from the removed "new or feared thing" habit, dropped when old data loads. */
const REMOVED_ENTRY_FIELDS = Object.freeze(['challengeDone', 'challengeNote']);
const REMOVED_POINT_KEYS = Object.freeze(['challenge']);

function withoutKeys(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

/**
 * Upgrades entries saved by an older app version: fields added later get their
 * "not done" value and fields of removed habits are dropped, so old data stays valid.
 * Anything that isn't an entry object is passed through for validation to report.
 * @param {unknown} entries
 * @returns {unknown}
 */
function migrateEntries(entries) {
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) return entries;
  return Object.fromEntries(Object.entries(entries).map(([date, entry]) => {
    const isEntryObject = typeof entry === 'object' && entry !== null && !Array.isArray(entry);
    return [date, isEntryObject ? withoutKeys({ ...ENTRY_FIELDS_ADDED_LATER, ...entry }, REMOVED_ENTRY_FIELDS) : entry];
  }));
}

/**
 * Validates parsed backup data and fills in any setting or entry field added in a newer app version.
 * @param {unknown} raw Parsed JSON.
 * @returns {{ isValid: true, data: object } | { isValid: false, errors: string[] }}
 */
export function parseBackup(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { isValid: false, errors: ['The file does not contain Winter Arc data.'] };
  }
  if (raw.version !== DATA_VERSION) {
    return { isValid: false, errors: [`Unsupported backup version ${JSON.stringify(raw.version)}; expected ${DATA_VERSION}.`] };
  }

  const defaults = createDefaultSettings();
  const points = withoutKeys({ ...defaults.points, ...raw.settings?.points }, REMOVED_POINT_KEYS);
  const settings = { ...defaults, ...raw.settings, points };
  const entries = migrateEntries(raw.entries);
  const errors = [
    ...validateSettings(settings),
    ...validateDateMap(entries, 'entries', validateEntry),
    ...validateDateMap(raw.weights, 'weights', validateWeight),
  ];
  if (errors.length > 0) return { isValid: false, errors };

  const meta = typeof raw.meta === 'object' && raw.meta !== null ? raw.meta : {};
  return {
    isValid: true,
    data: {
      version: DATA_VERSION,
      settings,
      entries,
      weights: raw.weights,
      meta: {
        createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : null,
        updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : null,
        lastBackupAt: typeof meta.lastBackupAt === 'string' ? meta.lastBackupAt : null,
      },
    },
  };
}

/**
 * Parses backup file text.
 * @param {string} text
 * @returns {ReturnType<typeof parseBackup>}
 */
export function parseBackupText(text) {
  try {
    return parseBackup(JSON.parse(text));
  } catch (error) {
    return { isValid: false, errors: [`The file is not valid JSON: ${error.message}`] };
  }
}

/**
 * Whether to show the "back up your data" banner.
 * Nothing to back up → no reminder. Otherwise remind when the last backup
 * (or, if never backed up, the first use) is at least BACKUP_REMINDER_DAYS old.
 * @param {object} data
 * @param {Date} now
 * @returns {boolean}
 */
export function needsBackupReminder(data, now) {
  const hasData = Object.keys(data.entries).length > 0 || Object.keys(data.weights).length > 0;
  if (!hasData) return false;
  const reference = data.meta.lastBackupAt ?? data.meta.createdAt;
  if (!reference) return true;
  return daysBetween(toLocalISODate(new Date(reference)), toLocalISODate(now)) >= BACKUP_REMINDER_DAYS;
}

/**
 * File name for an exported backup.
 * @param {Date} now
 * @returns {string} e.g. "winter-arc-backup-2026-11-02.json"
 */
export function backupFileName(now) {
  return `winter-arc-backup-${toLocalISODate(now)}.json`;
}
