import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_STATUS,
  OVERVIEW_ID,
  buildDayLog,
  buildOverviewLog,
  countLabel,
  dayStatus,
  filterBrokenDays,
  summarizeDayLog,
  summarizeOverview,
} from '../js/day-log.js';
import { WEEK_ONE, entriesFor, makeEntry, makePerfectEntry, makeSettings } from './helpers.js';

const settings = makeSettings();

describe('dayStatus', () => {
  it('should be kept when smoking one cigarette', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 1 });

    // Act
    const status = dayStatus('smoking', entry);

    // Assert
    assert.equal(status, DAY_STATUS.kept);
  });

  it('should be broken when smoking two cigarettes', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 2 });

    // Act
    const status = dayStatus('smoking', entry);

    // Assert
    assert.equal(status, DAY_STATUS.broken);
  });

  it('should be broken after one drink', () => {
    // Arrange
    const entry = makeEntry({ drinks: 1 });

    // Act
    const status = dayStatus('drinking', entry);

    // Assert
    assert.equal(status, DAY_STATUS.broken);
  });

  it('should be kept when no fap is ticked', () => {
    // Arrange
    const entry = makeEntry({ noFap: true });

    // Act
    const status = dayStatus('noFap', entry);

    // Assert
    assert.equal(status, DAY_STATUS.kept);
  });

  it('should be not logged when the day has no entry', () => {
    // Arrange
    const entry = undefined;

    // Act
    const status = dayStatus('noFap', entry);

    // Assert
    assert.equal(status, DAY_STATUS.missing);
  });

  it('should throw a descriptive error for an unknown habit', () => {
    // Arrange
    const habitId = 'flying';

    // Act
    const action = () => dayStatus(habitId, makeEntry());

    // Assert
    assert.throws(action, /Unknown habit "flying"/);
  });
});

describe('countLabel', () => {
  it('should use the singular for one cigarette', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 1 });

    // Act
    const label = countLabel('smoking', entry);

    // Assert
    assert.equal(label, '1 cigarette');
  });

  it('should use the plural for zero drinks', () => {
    // Arrange
    const entry = makeEntry({ drinks: 0 });

    // Act
    const label = countLabel('drinking', entry);

    // Assert
    assert.equal(label, '0 drinks');
  });

  it('should be null for a habit without a count', () => {
    // Arrange
    const entry = makeEntry({ noFap: true });

    // Act
    const label = countLabel('noFap', entry);

    // Assert
    assert.equal(label, null);
  });

  it('should be null for an unlogged day', () => {
    // Arrange
    const entry = undefined;

    // Act
    const label = countLabel('smoking', entry);

    // Assert
    assert.equal(label, null);
  });
});

describe('buildDayLog', () => {
  const entries = {
    '2026-10-26': makeEntry({ cigarettes: 0 }),
    '2026-10-27': makeEntry({ cigarettes: 3 }),
  };

  it('should list numbered days from day 1 up to today only', () => {
    // Arrange
    const today = '2026-10-28';

    // Act
    const rows = buildDayLog(settings, entries, today, 'smoking');

    // Assert
    assert.deepEqual(rows.map((row) => [row.dayNumber, row.date]), [[1, '2026-10-26'], [2, '2026-10-27'], [3, '2026-10-28']]);
  });

  it('should give each day its status and count', () => {
    // Arrange
    const today = '2026-10-28';

    // Act
    const rows = buildDayLog(settings, entries, today, 'smoking');

    // Assert
    assert.deepEqual(rows.map((row) => [row.status, row.count]), [
      [DAY_STATUS.kept, '0 cigarettes'],
      [DAY_STATUS.broken, '3 cigarettes'],
      [DAY_STATUS.missing, null],
    ]);
  });

  it('should be empty before the challenge starts', () => {
    // Arrange
    const today = '2026-10-25';

    // Act
    const rows = buildDayLog(settings, entries, today, 'smoking');

    // Assert
    assert.deepEqual(rows, []);
  });

  it('should list all 100 days once the challenge is over', () => {
    // Arrange
    const today = '2027-03-01';

    // Act
    const rows = buildDayLog(settings, {}, today, 'workout');

    // Assert
    assert.equal(rows.length, 100);
  });
});

describe('filterBrokenDays', () => {
  it('should keep only broken days, leaving out kept and not logged', () => {
    // Arrange
    const rows = buildDayLog(settings, { '2026-10-26': makeEntry({ drinks: 2 }), '2026-10-27': makeEntry() }, '2026-10-28', 'drinking');

    // Act
    const broken = filterBrokenDays(rows);

    // Assert
    assert.deepEqual(broken.map((row) => row.date), ['2026-10-26']);
  });
});

describe('summarizeDayLog', () => {
  it('should count kept, broken and not logged days plus total cigarettes', () => {
    // Arrange
    const entries = {
      '2026-10-26': makeEntry({ cigarettes: 1 }),
      '2026-10-27': makeEntry({ cigarettes: 4 }),
      '2026-10-28': makeEntry({ cigarettes: 0 }),
    };
    const rows = buildDayLog(settings, entries, '2026-10-29', 'smoking');

    // Act
    const summary = summarizeDayLog('smoking', rows, entries);

    // Assert
    assert.deepEqual(summary, { kept: 2, broken: 1, missing: 1, total: '5 cigarettes' });
  });

  it('should have no total for a habit without a count', () => {
    // Arrange
    const entries = { '2026-10-26': makeEntry({ noFap: true }) };
    const rows = buildDayLog(settings, entries, '2026-10-26', 'noFap');

    // Act
    const summary = summarizeDayLog('noFap', rows, entries);

    // Assert
    assert.deepEqual(summary, { kept: 1, broken: 0, missing: 0, total: null });
  });
});

describe('buildOverviewLog', () => {
  it('should show how many habits were kept out of all habits', () => {
    // Arrange
    const entries = { '2026-10-26': makePerfectEntry({ water: false }) };

    // Act
    const [row] = buildOverviewLog(settings, entries, '2026-10-26');

    // Assert
    assert.deepEqual({ keptCount: row.keptCount, habitCount: row.habitCount }, { keptCount: 7, habitCount: 8 });
  });

  it('should include the Sunday weekly workout bonus in that day\'s points', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE.slice(0, 5), makeEntry({ workout: true }));

    // Act
    const sunday = buildOverviewLog(settings, entries, '2026-11-02').find((row) => row.date === '2026-11-01');

    // Assert
    assert.equal(sunday.points, 15);
  });

  it('should mark an unlogged day as not logged with no kept count', () => {
    // Arrange
    const entries = {};

    // Act
    const [row] = buildOverviewLog(settings, entries, '2026-10-26');

    // Assert
    assert.deepEqual({ status: row.status, keptCount: row.keptCount }, { status: DAY_STATUS.missing, keptCount: null });
  });

  it('should use the overview id distinct from every habit id', () => {
    // Arrange
    const id = OVERVIEW_ID;

    // Act
    const isHabitId = ['smoking', 'drinking', 'workout', 'food', 'water', 'sleep', 'challenge', 'noFap'].includes(id);

    // Assert
    assert.equal(isHabitId, false);
  });
});

describe('summarizeOverview', () => {
  it('should count logged days and average habits kept per logged day', () => {
    // Arrange
    const entries = {
      '2026-10-26': makePerfectEntry(),
      '2026-10-27': makeEntry({ cigarettes: 5, drinks: 2 }),
    };
    const rows = buildOverviewLog(settings, entries, '2026-10-28');

    // Act
    const summary = summarizeOverview(rows);

    // Assert
    assert.deepEqual(summary, { logged: 2, missing: 1, averageKept: '4.0', habitCount: 8 });
  });
});
