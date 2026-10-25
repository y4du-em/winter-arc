import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_END_DATE, CHALLENGE_START_DATE } from '../js/config.js';
import {
  addDays,
  challengeWeeks,
  clampDate,
  dayOfWeek,
  daysBetween,
  isISODate,
  listDates,
  toLocalISODate,
} from '../js/dates.js';

describe('isISODate', () => {
  it('should accept a real calendar date', () => {
    // Arrange
    const value = '2026-10-26';

    // Act
    const result = isISODate(value);

    // Assert
    assert.equal(result, true);
  });

  it('should reject an impossible date like February 30', () => {
    // Arrange
    const value = '2026-02-30';

    // Act
    const result = isISODate(value);

    // Assert
    assert.equal(result, false);
  });

  it('should reject a non-string value', () => {
    // Arrange
    const value = 20261026;

    // Act
    const result = isISODate(value);

    // Assert
    assert.equal(result, false);
  });
});

describe('challenge calendar', () => {
  it('should span exactly 100 days from Oct 26 2026 to Feb 2 2027', () => {
    // Arrange
    const start = CHALLENGE_START_DATE;
    const end = CHALLENGE_END_DATE;

    // Act
    const dates = listDates(start, end);

    // Assert
    assert.equal(dates.length, 100);
  });

  it('should start on a Monday', () => {
    // Arrange
    const start = CHALLENGE_START_DATE;

    // Act
    const weekday = dayOfWeek(start);

    // Assert
    assert.equal(weekday, 0);
  });

  it('should split into 14 full weeks plus one partial week', () => {
    // Arrange
    const start = CHALLENGE_START_DATE;
    const end = CHALLENGE_END_DATE;

    // Act
    const weeks = challengeWeeks(start, end);

    // Assert
    assert.deepEqual(weeks.map((week) => week.isFullWeek).filter(Boolean).length, 14);
  });

  it('should flag the final Feb 1–2 week as partial', () => {
    // Arrange
    const start = CHALLENGE_START_DATE;
    const end = CHALLENGE_END_DATE;

    // Act
    const lastWeek = challengeWeeks(start, end).at(-1);

    // Assert
    assert.deepEqual(lastWeek, { dates: ['2027-02-01', '2027-02-02'], isFullWeek: false, lastDate: '2027-02-02' });
  });
});

describe('date arithmetic', () => {
  it('should cross a year boundary when adding days', () => {
    // Arrange
    const date = '2026-12-31';

    // Act
    const result = addDays(date, 1);

    // Assert
    assert.equal(result, '2027-01-01');
  });

  it('should return a negative count when the target is earlier', () => {
    // Arrange
    const from = '2026-11-05';
    const to = '2026-11-01';

    // Act
    const result = daysBetween(from, to);

    // Assert
    assert.equal(result, -4);
  });

  it('should return an empty list when end is before start', () => {
    // Arrange
    const start = '2026-11-05';
    const end = '2026-11-01';

    // Act
    const result = listDates(start, end);

    // Assert
    assert.deepEqual(result, []);
  });

  it('should throw a descriptive error for an invalid date', () => {
    // Arrange
    const badDate = 'not-a-date';

    // Act
    const action = () => addDays(badDate, 1);

    // Assert
    assert.throws(action, /Invalid ISO date: "not-a-date"/);
  });

  it('should format a local Date using local calendar parts', () => {
    // Arrange
    const moment = new Date(2026, 9, 26, 23, 59);

    // Act
    const result = toLocalISODate(moment);

    // Assert
    assert.equal(result, '2026-10-26');
  });

  it('should clamp a date below the range to the minimum', () => {
    // Arrange
    const date = '2026-10-01';

    // Act
    const result = clampDate(date, '2026-10-26', '2027-02-02');

    // Assert
    assert.equal(result, '2026-10-26');
  });
});
