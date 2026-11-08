import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { habitHeatLevel, heatLevel } from '../js/heatmap.js';
import { makeEntry } from './helpers.js';

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

describe('habitHeatLevel', () => {
  it('should color a zero-cigarette day as kept for smoking 0', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 0 });

    // Act
    const level = habitHeatLevel('smokeFree', entry, false);

    // Assert
    assert.equal(level, 'kept');
  });

  it('should color a one-cigarette day as broken for smoking 0', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 1 });

    // Act
    const level = habitHeatLevel('smokeFree', entry, false);

    // Assert
    assert.equal(level, 'broken');
  });

  it('should color an unlogged past day as missing', () => {
    // Arrange
    const entry = undefined;

    // Act
    const level = habitHeatLevel('screenTime', entry, false);

    // Assert
    assert.equal(level, 'missing');
  });

  it('should color an upcoming day as future', () => {
    // Arrange
    const entry = undefined;

    // Act
    const level = habitHeatLevel('noFap', entry, true);

    // Assert
    assert.equal(level, 'future');
  });
});
