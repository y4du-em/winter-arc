/**
 * Pure weight calculations: start, latest, change and progress toward the goal.
 */

/**
 * Summarizes weigh-ins.
 * Progress works for both losing and gaining goals: it is the share of the
 * distance from the first weigh-in to the goal that has been covered, clamped to 0–1.
 * @param {Record<string, number>} weights Map of "YYYY-MM-DD" to kg.
 * @param {number|null} goalWeightKg
 * @returns {{ weighIns: [string, number][], start: number|null, latest: number|null, change: number|null, goalShare: number|null, remaining: number|null }}
 */
export function summarizeWeights(weights, goalWeightKg) {
  const weighIns = Object.entries(weights).sort(([first], [second]) => first.localeCompare(second));
  if (weighIns.length === 0) {
    return { weighIns, start: null, latest: null, change: null, goalShare: null, remaining: null };
  }

  const start = weighIns[0][1];
  const latest = weighIns.at(-1)[1];
  const change = roundToTenth(latest - start);
  if (goalWeightKg === null) return { weighIns, start, latest, change, goalShare: null, remaining: null };

  const totalDistance = goalWeightKg - start;
  const covered = latest - start;
  const goalShare = totalDistance === 0 ? 1 : clamp(covered / totalDistance, 0, 1);
  return { weighIns, start, latest, change, goalShare, remaining: roundToTenth(goalWeightKg - latest) };
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
