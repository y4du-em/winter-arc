import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { heatLevel } from '../js/heatmap.js';

const MAX_POINTS = 60;

describe('heatLevel', () => {
  it('should mark a future day as future', () => {
    // Arrange
    const day = undefined;

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'future');
  });

  it('should mark an unlogged past day as missing', () => {
    // Arrange
    const day = { isLogged: false, total: 0 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'missing');
  });

  it('should mark a maximum-score day as full', () => {
    // Arrange
    const day = { isLogged: true, total: 60 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'full');
  });

  it('should mark a 45-point day as high', () => {
    // Arrange
    const day = { isLogged: true, total: 45 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'high');
  });

  it('should mark a small positive day as low', () => {
    // Arrange
    const day = { isLogged: true, total: 5 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'low');
  });

  it('should mark a day at -10 or below as negative', () => {
    // Arrange
    const day = { isLogged: true, total: -16 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'negative');
  });

  it('should mark a logged zero day as zero', () => {
    // Arrange
    const day = { isLogged: true, total: 0 };

    // Act
    const level = heatLevel(day, MAX_POINTS);

    // Assert
    assert.equal(level, 'zero');
  });
});
