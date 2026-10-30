import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backupFileName, createEmptyData, needsBackupReminder, parseBackup, parseBackupText } from '../js/backup.js';
import { validateSettings } from '../js/validation.js';
import { makeEntry, makeSettings } from './helpers.js';

const FIXED_NOW = new Date(2026, 10, 10, 9, 0);

function makeData(overrides = {}) {
  return { ...createEmptyData(new Date(2026, 9, 26, 8, 0)), ...overrides };
}

describe('parseBackup', () => {
  it('should accept a valid backup', () => {
    // Arrange
    const raw = makeData({ entries: { '2026-10-26': makeEntry() }, weights: { '2026-10-26': 82.4 } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.isValid, true);
  });

  it('should reject a backup from an unknown version', () => {
    // Arrange
    const raw = makeData({ version: 99 });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.errors, ['Unsupported backup version 99; expected 1.']);
  });

  it('should reject an entry with a negative cigarette count', () => {
    // Arrange
    const raw = makeData({ entries: { '2026-10-26': makeEntry({ cigarettes: -1 }) } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.errors, ['entries 2026-10-26: "cigarettes" must be a whole number from 0 to 99.']);
  });

  it('should reject an entry keyed by an invalid date', () => {
    // Arrange
    const raw = makeData({ entries: { 'yesterday': makeEntry() } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.errors, ['entries: "yesterday" is not a valid date.']);
  });

  it('should reject an impossible weight', () => {
    // Arrange
    const raw = makeData({ weights: { '2026-10-26': 2000 } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.isValid, false);
  });

  it('should fill in a point value missing from an older backup', () => {
    // Arrange
    const raw = makeData();
    delete raw.settings.points.challenge;

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.data.settings.points.challenge, 10);
  });

  it('should accept an entry saved before no fap existed', () => {
    // Arrange
    const oldEntry = makeEntry();
    delete oldEntry.noFap;
    const raw = makeData({ entries: { '2026-10-26': oldEntry } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.isValid, true);
  });

  it('should mark no fap as not ticked on entries saved before it existed', () => {
    // Arrange
    const oldEntry = makeEntry({ workout: true });
    delete oldEntry.noFap;
    const raw = makeData({ entries: { '2026-10-26': oldEntry } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.data.entries['2026-10-26'], { ...oldEntry, noFap: false });
  });

  it('should keep a saved no fap tick unchanged', () => {
    // Arrange
    const raw = makeData({ entries: { '2026-10-26': makeEntry({ noFap: true }) } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.data.entries['2026-10-26'].noFap, true);
  });

  it('should reject a no fap value that is not true or false', () => {
    // Arrange
    const raw = makeData({ entries: { '2026-10-26': makeEntry({ noFap: 'yes' }) } });

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.errors, ['entries 2026-10-26: "noFap" must be true or false.']);
  });

  it('should fill in the no fap point value for settings saved before it existed', () => {
    // Arrange
    const raw = makeData();
    delete raw.settings.points.noFap;

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.equal(result.data.settings.points.noFap, 5);
  });

  it('should reject an array', () => {
    // Arrange
    const raw = [];

    // Act
    const result = parseBackup(raw);

    // Assert
    assert.deepEqual(result.errors, ['The file does not contain Winter Arc data.']);
  });
});

describe('parseBackupText', () => {
  it('should report malformed JSON instead of throwing', () => {
    // Arrange
    const text = '{ not json';

    // Act
    const result = parseBackupText(text);

    // Assert
    assert.match(result.errors[0], /^The file is not valid JSON:/);
  });
});

describe('validateSettings', () => {
  it('should reject an end date before the start date', () => {
    // Arrange
    const settings = makeSettings({ startDate: '2026-10-26', endDate: '2026-10-01' });

    // Act
    const errors = validateSettings(settings);

    // Assert
    assert.deepEqual(errors, ['End date must be after the start date.']);
  });

  it('should accept the default settings', () => {
    // Arrange
    const settings = makeSettings();

    // Act
    const errors = validateSettings(settings);

    // Assert
    assert.deepEqual(errors, []);
  });

  it('should reject 8 workout days per week', () => {
    // Arrange
    const settings = makeSettings({ workoutDaysPerWeek: 8 });

    // Act
    const errors = validateSettings(settings);

    // Assert
    assert.deepEqual(errors, ['Workout days per week must be a whole number from 1 to 7.']);
  });
});

describe('needsBackupReminder', () => {
  it('should not remind when there is no data yet', () => {
    // Arrange
    const data = makeData();

    // Act
    const result = needsBackupReminder(data, FIXED_NOW);

    // Assert
    assert.equal(result, false);
  });

  it('should remind when never backed up and first use was over a week ago', () => {
    // Arrange
    const data = makeData({ entries: { '2026-10-26': makeEntry() } });

    // Act
    const result = needsBackupReminder(data, FIXED_NOW);

    // Assert
    assert.equal(result, true);
  });

  it('should not remind when the last backup was 2 days ago', () => {
    // Arrange
    const data = makeData({ entries: { '2026-10-26': makeEntry() } });
    data.meta.lastBackupAt = new Date(2026, 10, 8, 9, 0).toISOString();

    // Act
    const result = needsBackupReminder(data, FIXED_NOW);

    // Assert
    assert.equal(result, false);
  });
});

describe('backupFileName', () => {
  it('should include the local date', () => {
    // Arrange
    const now = FIXED_NOW;

    // Act
    const name = backupFileName(now);

    // Assert
    assert.equal(name, 'winter-arc-backup-2026-11-10.json');
  });
});
