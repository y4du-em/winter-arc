import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { challengeWeeks } from '../js/dates.js';
import {
  buildDailySeries,
  isChallengeComplete,
  maxDailyPoints,
  scoreDay,
  scoreLimitedHabit,
  weeklyWorkoutAdjustment,
} from '../js/scoring.js';
import { WEEK_ONE, entriesFor, makeEntry, makePerfectEntry, makeSettings } from './helpers.js';

const SMOKING_RULES = { zero: 10, one: 4, extraPenalty: 5 };

describe('scoreLimitedHabit', () => {
  it('should give +10 for zero cigarettes', () => {
    // Arrange
    const count = 0;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, 10);
  });

  it('should give +4 for one cigarette', () => {
    // Arrange
    const count = 1;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, 4);
  });

  it('should give -1 for two cigarettes', () => {
    // Arrange
    const count = 2;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, -1);
  });

  it('should give -6 for three cigarettes', () => {
    // Arrange
    const count = 3;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, -6);
  });

  it('should give -16 for five cigarettes', () => {
    // Arrange
    const count = 5;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, -16);
  });

  it('should give 0 for a missing or invalid count', () => {
    // Arrange
    const count = undefined;

    // Act
    const points = scoreLimitedHabit(count, SMOKING_RULES);

    // Assert
    assert.equal(points, 0);
  });
});

describe('isChallengeComplete', () => {
  it('should be true when ticked with a description', () => {
    // Arrange
    const entry = makeEntry({ challengeDone: true, challengeNote: 'Sang at open mic' });

    // Act
    const result = isChallengeComplete(entry);

    // Assert
    assert.equal(result, true);
  });

  it('should be false when ticked with only whitespace as description', () => {
    // Arrange
    const entry = makeEntry({ challengeDone: true, challengeNote: '   ' });

    // Act
    const result = isChallengeComplete(entry);

    // Assert
    assert.equal(result, false);
  });

  it('should be false when a description exists but it is not ticked', () => {
    // Arrange
    const entry = makeEntry({ challengeDone: false, challengeNote: 'Cold shower' });

    // Act
    const result = isChallengeComplete(entry);

    // Assert
    assert.equal(result, false);
  });
});

describe('scoreDay', () => {
  it('should total 60 for a perfect day with default points', () => {
    // Arrange
    const entry = makePerfectEntry();

    // Act
    const { total } = scoreDay(entry, makeSettings().points);

    // Assert
    assert.equal(total, 60);
  });

  it('should total 0 for an unlogged day', () => {
    // Arrange
    const entry = undefined;

    // Act
    const { total } = scoreDay(entry, makeSettings().points);

    // Assert
    assert.equal(total, 0);
  });

  it('should give 0 challenge points when ticked without a description', () => {
    // Arrange
    const entry = makeEntry({ challengeDone: true, challengeNote: '' });

    // Act
    const { breakdown } = scoreDay(entry, makeSettings().points);

    // Assert
    assert.equal(breakdown.challenge, 0);
  });

  it('should score drinks with the same scheme as cigarettes', () => {
    // Arrange
    const entry = makeEntry({ drinks: 3 });

    // Act
    const { breakdown } = scoreDay(entry, makeSettings().points);

    // Assert
    assert.equal(breakdown.drinking, -6);
  });

  it('should go negative on a bad day', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 5, drinks: 4 });

    // Act
    const { total } = scoreDay(entry, makeSettings().points);

    // Assert
    assert.equal(total, -16 + -11);
  });
});

describe('maxDailyPoints', () => {
  it('should be 60 with default points', () => {
    // Arrange
    const { points } = makeSettings();

    // Act
    const result = maxDailyPoints(points);

    // Assert
    assert.equal(result, 60);
  });
});

describe('weeklyWorkoutAdjustment', () => {
  const settings = makeSettings();
  const [weekOne] = challengeWeeks(settings.startDate, settings.endDate);
  const fiveWorkouts = entriesFor(WEEK_ONE.slice(0, 5), makeEntry({ workout: true }));
  const fourWorkouts = entriesFor(WEEK_ONE.slice(0, 4), makeEntry({ workout: true }));

  it('should give +15 after a week with 5 workouts', () => {
    // Arrange
    const today = '2026-11-02';

    // Act
    const result = weeklyWorkoutAdjustment(weekOne, fiveWorkouts, settings, today);

    // Assert
    assert.equal(result, 15);
  });

  it('should give -15 after a week with only 4 workouts', () => {
    // Arrange
    const today = '2026-11-02';

    // Act
    const result = weeklyWorkoutAdjustment(weekOne, fourWorkouts, settings, today);

    // Assert
    assert.equal(result, -15);
  });

  it('should already give the bonus on Sunday once 5 workouts are done', () => {
    // Arrange
    const today = '2026-11-01';

    // Act
    const result = weeklyWorkoutAdjustment(weekOne, fiveWorkouts, settings, today);

    // Assert
    assert.equal(result, 15);
  });

  it('should not give the penalty on Sunday itself, before the week is over', () => {
    // Arrange
    const today = '2026-11-01';

    // Act
    const result = weeklyWorkoutAdjustment(weekOne, fourWorkouts, settings, today);

    // Assert
    assert.equal(result, 0);
  });

  it('should give nothing during an unfinished week', () => {
    // Arrange
    const today = '2026-10-30';

    // Act
    const result = weeklyWorkoutAdjustment(weekOne, fiveWorkouts, settings, today);

    // Assert
    assert.equal(result, 0);
  });

  it('should skip the weekly rule for the final 2-day week', () => {
    // Arrange
    const lastWeek = challengeWeeks(settings.startDate, settings.endDate).at(-1);
    const today = '2027-02-10';

    // Act
    const result = weeklyWorkoutAdjustment(lastWeek, {}, settings, today);

    // Assert
    assert.equal(result, 0);
  });
});

describe('buildDailySeries', () => {
  const settings = makeSettings();

  it('should leave out future days', () => {
    // Arrange
    const today = '2026-10-28';

    // Act
    const series = buildDailySeries(settings, {}, today);

    // Assert
    assert.equal(series.length, 3);
  });

  it('should be empty before the challenge starts', () => {
    // Arrange
    const today = '2026-10-25';

    // Act
    const series = buildDailySeries(settings, {}, today);

    // Assert
    assert.deepEqual(series, []);
  });

  it('should book the weekly bonus on Sunday and include it in the running total', () => {
    // Arrange
    const entries = entriesFor(WEEK_ONE.slice(0, 5), makeEntry({ workout: true }));
    const today = '2026-11-02';

    // Act
    const sunday = buildDailySeries(settings, entries, today)[6];

    // Assert
    assert.deepEqual(
      { weeklyAdjustment: sunday.weeklyAdjustment, cumulative: sunday.cumulative },
      { weeklyAdjustment: 15, cumulative: 5 * (10 + 10 + 10) + 15 },
    );
  });

  it('should mark days without an entry as not logged', () => {
    // Arrange
    const entries = { '2026-10-26': makeEntry() };
    const today = '2026-10-27';

    // Act
    const series = buildDailySeries(settings, entries, today);

    // Assert
    assert.deepEqual(series.map((day) => day.isLogged), [true, false]);
  });
});
