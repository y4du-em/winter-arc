import { createDefaultSettings } from '../js/config.js';

/**
 * Builds a daily entry where nothing was done and nothing was smoked or drunk.
 * @param {object} [overrides]
 */
export function makeEntry(overrides = {}) {
  return {
    cigarettes: 0,
    drinks: 0,
    workout: false,
    food: false,
    water: false,
    sleep: false,
    challengeDone: false,
    challengeNote: '',
    ...overrides,
  };
}

/** A day where every habit is met. */
export function makePerfectEntry(overrides = {}) {
  return makeEntry({ workout: true, food: true, water: true, sleep: true, challengeDone: true, challengeNote: 'Cold shower', ...overrides });
}

/** Default settings with optional overrides. */
export function makeSettings(overrides = {}) {
  return { ...createDefaultSettings(), ...overrides };
}

/**
 * Builds an entries map giving each date the same entry.
 * @param {string[]} dates
 * @param {object} entry
 */
export function entriesFor(dates, entry) {
  return Object.fromEntries(dates.map((date) => [date, { ...entry }]));
}

// Week 1 of the default challenge: Mon Oct 26 – Sun Nov 1, 2026.
export const WEEK_ONE = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
