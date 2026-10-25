/**
 * Small DOM and formatting helpers shared by the views.
 * All user text goes through textContent, never innerHTML.
 */

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const TOAST_DURATION_MS = 3500;
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Finds an element by id.
 * @param {string} id
 * @returns {HTMLElement}
 * @throws {Error} When the element is missing, which means index.html and the code disagree.
 */
export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} is missing from index.html`);
  return element;
}

/**
 * Creates an element.
 * @param {string} tag
 * @param {{ className?: string, text?: string, attrs?: Record<string, string>, on?: Record<string, EventListener> }} [options]
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, { className, text, attrs = {}, on = {} } = {}, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  Object.entries(on).forEach(([type, listener]) => element.addEventListener(type, listener));
  element.append(...children);
  return element;
}

/**
 * Formats a number with an explicit sign, e.g. "+10", "−5", "0".
 * @param {number} value
 * @returns {string}
 */
export function formatSigned(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

function isoToUTCDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** "Mon, 26 Oct" style label. */
export function formatDate(isoDate) {
  return DATE_FORMAT.format(isoToUTCDate(isoDate));
}

/** "26 Oct" style label. */
export function formatShortDate(isoDate) {
  return SHORT_DATE_FORMAT.format(isoToUTCDate(isoDate));
}

/**
 * Formats kilograms with one decimal.
 * @param {number} weightKg
 * @returns {string}
 */
export function formatKg(weightKg) {
  return `${weightKg.toFixed(1)} kg`;
}

/**
 * Reads a number input; empty means null.
 * @param {HTMLInputElement} input
 * @returns {number|null} NaN when the text is not a number.
 */
export function readOptionalNumber(input) {
  const text = input.value.trim();
  return text === '' ? null : Number(text);
}

/**
 * Shows a short message at the bottom of the screen.
 * @param {string} message
 * @param {'info'|'error'} [kind='info']
 */
export function showToast(message, kind = 'info') {
  const toast = byId('toast');
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, TOAST_DURATION_MS);
}

/**
 * A stat tile: a label and a big value.
 * @param {string} label
 * @param {string} value
 * @param {string} [detail]
 * @returns {HTMLElement}
 */
export function statTile(label, value, detail) {
  return el('div', { className: 'card stat' }, [
    el('p', { className: 'eyebrow', text: label }),
    el('p', { className: 'stat-value', text: value }),
    ...(detail ? [el('p', { className: 'muted small', text: detail })] : []),
  ]);
}
