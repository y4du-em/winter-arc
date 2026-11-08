import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_STATUS, countLabel, dayStatus } from '../js/habit-status.js';
import { makeEntry } from './helpers.js';


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

  it('should show the cigarette count for smoking 0 too', () => {
    // Arrange
    const entry = makeEntry({ cigarettes: 2 });

    // Act
    const label = countLabel('smokeFree', entry);

    // Assert
    assert.equal(label, '2 cigarettes');
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
