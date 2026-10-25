import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { challengeWeeks } from '../js/dates.js';
import { HABITS, bestStreak, countPerfectWeeks, currentStreak, isPerfectWeek, streakSummary } from '../js/streaks.js';
import { WEEK_ONE, entriesFor, makeEntry, makePerfectEntry, makeSettings } from './helpers.js';

const habit = (id) => HABITS.find((candidate) => candidate.id === id);
const settings = makeSettings();
const [weekOne] = challengeWeeks(settings.startDate, settings.endDate);

describe('habit streak rules', () => {
  it('should keep the smoking streak with one cigarette', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 1 });

    // Act
    const result = habit('smoking').isMet(entry);

    // Assert
    assert.equal(result, true);
  });

  it('should break the smoking streak with two cigarettes', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 2 });

    // Act
    const result = habit('smoking').isMet(entry);

    // Assert
    assert.equal(result, false);
  });

  it('should break the drinking streak with one drink', () => {
    // Arrange
    const entry = makeEntry({ drinks: 1 });

    // Act
    const result = habit('drinking').isMet(entry);

    // Assert
    assert.equal(result, false);
  });

  it('should keep the drinking streak with zero drinks', () => {
    // Arrange
    const entry = makeEntry({ drinks: 0 });

    // Act
    const result = habit('drinking').isMet(entry);

    // Assert
    assert.equal(result, true);
  });

  it('should not count the new/feared thing without a description', () => {
    // Arrange
    const entry = makeEntry({ challengeDone: true, challengeNote: '' });

    // Act
    const result = habit('challenge').isMet(entry);

    // Assert
    assert.equal(result, false);
  });

  it('should not count an unlogged day for any habit', () => {
    // Arrange
    const entry = undefined;

    // Act
    const result = HABITS.some((candidate) => candidate.isMet(entry));

    // Assert
    assert.equal(result, false);
  });
});

describe('currentStreak', () => {
  it('should count back from today', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE.slice(0, 3), makeEntry());

    // Act
    const result = currentStreak(habit('drinking'), settings, entries, '2026-10-28');

    // Assert
    assert.equal(result, 3);
  });

  it('should start from yesterday when today is not logged yet', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE.slice(0, 3), makeEntry());

    // Act
    const result = currentStreak(habit('drinking'), settings, entries, '2026-10-29');

    // Assert
    assert.equal(result, 3);
  });

  it('should reset after a day that breaks the rule', () => {
    // Arrange
    const entries = { ...entriesFor(WEEK_ONE.slice(0, 3), makeEntry()), '2026-10-27': makeEntry({ drinks: 1 }) };

    // Act
    const result = currentStreak(habit('drinking'), settings, entries, '2026-10-28');

    // Assert
    assert.equal(result, 1);
  });

  it('should be 0 before the challenge starts', () => {
    // Arrange
    const entries = {};

    // Act
    const result = currentStreak(habit('smoking'), settings, entries, '2026-10-25');

    // Assert
    assert.equal(result, 0);
  });
});

describe('bestStreak', () => {
  it('should remember the longest run even after it broke', () => {
    // Arrange
    const entries = { ...entriesFor(WEEK_ONE, makeEntry()), '2026-10-30': makeEntry({ drinks: 2 }) };

    // Act
    const result = bestStreak(habit('drinking'), settings, entries, '2026-11-01');

    // Assert
    assert.equal(result, 4);
  });
});

describe('isPerfectWeek', () => {
  it('should be perfect when every core habit is met daily and 5 workouts are done', () => {
    // Arrange
    const entries = {
      ...entriesFor(WEEK_ONE, makePerfectEntry({ workout: false, water: false, sleep: false })),
      ...entriesFor(WEEK_ONE.slice(0, 5), makePerfectEntry({ water: false, sleep: false })),
    };

    // Act
    const result = isPerfectWeek(weekOne, entries, settings);

    // Assert
    assert.equal(result, true);
  });

  it('should not be perfect with only 4 workouts', () => {
    // Arrange
    const entries = {
      ...entriesFor(WEEK_ONE, makePerfectEntry({ workout: false })),
      ...entriesFor(WEEK_ONE.slice(0, 4), makePerfectEntry()),
    };

    // Act
    const result = isPerfectWeek(weekOne, entries, settings);

    // Assert
    assert.equal(result, false);
  });

  it('should not be perfect when one day has a drink', () => {
    // Arrange
    const entries = { ...entriesFor(WEEK_ONE, makePerfectEntry()), '2026-10-31': makePerfectEntry({ drinks: 1 }) };

    // Act
    const result = isPerfectWeek(weekOne, entries, settings);

    // Assert
    assert.equal(result, false);
  });

  it('should still be perfect with one cigarette a day', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE, makePerfectEntry({ cigarettes: 1 }));

    // Act
    const result = isPerfectWeek(weekOne, entries, settings);

    // Assert
    assert.equal(result, true);
  });
});

describe('countPerfectWeeks', () => {
  it('should not count a week that has not finished yet', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE, makePerfectEntry());

    // Act
    const result = countPerfectWeeks(settings, entries, '2026-10-31');

    // Assert
    assert.equal(result, 0);
  });

  it('should count a finished perfect week', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE, makePerfectEntry());

    // Act
    const result = countPerfectWeeks(settings, entries, '2026-11-01');

    // Assert
    assert.equal(result, 1);
  });
});

describe('streakSummary', () => {
  it('should mark the 7-day badge as earned after a 7-day streak', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE, makePerfectEntry());

    // Act
    const smoking = streakSummary(settings, entries, '2026-11-01').find((item) => item.habit.id === 'smoking');

    // Assert
    assert.deepEqual(smoking.milestones.slice(0, 2), [{ days: 7, isEarned: true }, { days: 14, isEarned: false }]);
  });
});
