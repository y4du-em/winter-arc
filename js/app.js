/**
 * App entry point: loads data, wires the views and navigation, registers the service worker.
 */

import { needsBackupReminder } from './backup.js';
import { daysBetween, toLocalISODate } from './dates.js';
import { byId, formatDate, formatSigned, showToast } from './dom.js';
import { buildDailySeries } from './scoring.js';
import { downloadBackup, loadData, requestPersistentStorage, saveData } from './storage.js';
import { createProgressView } from './views/progress.js';
import { createSettingsView } from './views/settings.js';
import { createTodayView } from './views/today.js';
import { createWeightView } from './views/weight.js';

const DEFAULT_VIEW = 'today';

let data = null;
let persistStatus = 'unknown';
let activeView = DEFAULT_VIEW;
let isBannerDismissed = false;
let views = {};

const app = {
  getData: () => data,
  getToday: () => toLocalISODate(new Date()),
  getPersistStatus: () => persistStatus,

  /**
   * Applies a change to the data, saves it and re-renders.
   * @param {(data: object) => void} mutate
   * @param {string} [message] Toast shown on success.
   */
  async save(mutate, message) {
    mutate(data);
    try {
      await saveData(data, new Date());
      if (message) showToast(message);
    } catch (error) {
      console.error('Saving failed', error);
      showToast(error.message, 'error');
    }
    render();
  },

  /**
   * Replaces all data, e.g. after importing a backup.
   * @param {object} nextData Already validated.
   */
  async replaceData(nextData) {
    data = nextData;
    await app.save(() => {}, 'Backup restored');
  },

  /** Opens a specific day on the Today screen. */
  openDay(date) {
    views.today.showDate(date);
    navigate('today');
  },
};

function renderHeader() {
  const today = app.getToday();
  const { startDate, endDate } = data.settings;
  const totalDays = daysBetween(startDate, endDate) + 1;
  const series = buildDailySeries(data.settings, data.entries, today);

  let progressText;
  if (today < startDate) progressText = `Starts ${formatDate(startDate)} · ${totalDays} days`;
  else if (today > endDate) progressText = `Completed · ${totalDays} days`;
  else progressText = `Day ${daysBetween(startDate, today) + 1} of ${totalDays} · ends ${formatDate(endDate)}`;

  byId('header-progress').textContent = progressText;
  byId('header-total').textContent = formatSigned(series.at(-1)?.cumulative ?? 0);
  byId('backup-banner').hidden = isBannerDismissed || !needsBackupReminder(data, new Date());
}

function render() {
  renderHeader();
  views[activeView].render();
}

function navigate(viewName) {
  activeView = viewName;
  Object.keys(views).forEach((name) => {
    byId(`view-${name}`).hidden = name !== viewName;
    const tab = byId(`nav-${name}`);
    if (name === viewName) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });
  render();
}

function bindShell() {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => navigate(tab.dataset.view)));
  byId('banner-dismiss').addEventListener('click', () => {
    isBannerDismissed = true;
    renderHeader();
  });
  byId('banner-backup').addEventListener('click', async () => {
    const now = new Date();
    await app.save((current) => { current.meta.lastBackupAt = now.toISOString(); });
    downloadBackup(data, now);
    showToast('Backup downloaded. Keep the file somewhere safe.');
  });
  // The app may stay open past midnight; refresh "today" when it comes back into view.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => console.error('Service worker registration failed', error));
}

async function main() {
  const loaded = await loadData(new Date());
  data = loaded.data;
  loaded.warnings.forEach((warning) => showToast(warning, 'error'));

  views = {
    today: createTodayView(app),
    progress: createProgressView(app),
    weight: createWeightView(app),
    settings: createSettingsView(app),
  };
  bindShell();
  navigate(DEFAULT_VIEW);
  registerServiceWorker();

  persistStatus = await requestPersistentStorage();
  if (activeView === 'settings') render();
}

main().catch((error) => {
  console.error('Winter Arc failed to start', error);
  document.body.prepend(Object.assign(document.createElement('p'), {
    className: 'fatal',
    textContent: `Winter Arc couldn't start: ${error.message}. Your saved data has not been changed.`,
  }));
});
