import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWeights } from '../js/weight-stats.js';

describe('summarizeWeights', () => {
  it('should return nulls when there are no weigh-ins', () => {
    // Arrange
    const weights = {};

    // Act
    const summary = summarizeWeights(weights, 75);

    // Assert
    assert.deepEqual(summary, { weighIns: [], start: null, latest: null, change: null, goalShare: null, remaining: null });
  });

  it('should sort weigh-ins by date regardless of insertion order', () => {
    // Arrange
    const weights = { '2026-11-09': 81, '2026-10-26': 83 };

    // Act
    const { weighIns } = summarizeWeights(weights, null);

    // Assert
    assert.deepEqual(weighIns, [['2026-10-26', 83], ['2026-11-09', 81]]);
  });

  it('should report change since the first weigh-in rounded to 0.1 kg', () => {
    // Arrange
    const weights = { '2026-10-26': 82.3, '2026-11-02': 81.1 };

    // Act
    const { change } = summarizeWeights(weights, null);

    // Assert
    assert.equal(change, -1.2);
  });

  it('should be halfway when half the distance to a loss goal is covered', () => {
    // Arrange
    const weights = { '2026-10-26': 84, '2026-11-16': 82 };

    // Act
    const { goalShare } = summarizeWeights(weights, 80);

    // Assert
    assert.equal(goalShare, 0.5);
  });

  it('should work for a weight gain goal', () => {
    // Arrange
    const weights = { '2026-10-26': 60, '2026-11-16': 63 };

    // Act
    const { goalShare } = summarizeWeights(weights, 66);

    // Assert
    assert.equal(goalShare, 0.5);
  });

  it('should clamp progress at 0 when moving away from the goal', () => {
    // Arrange
    const weights = { '2026-10-26': 80, '2026-11-02': 82 };

    // Act
    const { goalShare } = summarizeWeights(weights, 75);

    // Assert
    assert.equal(goalShare, 0);
  });

  it('should count as complete when the start weight already equals the goal', () => {
    // Arrange
    const weights = { '2026-10-26': 75 };

    // Act
    const { goalShare } = summarizeWeights(weights, 75);

    // Assert
    assert.equal(goalShare, 1);
  });
});
