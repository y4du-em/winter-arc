/**
 * Browser persistence: IndexedDB as the primary store, mirrored to localStorage
 * as a second copy. Also handles persistent-storage requests and backup download.
 */

import { backupFileName, createEmptyData, parseBackup } from './backup.js';

const DB_NAME = 'winter-arc';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const RECORD_KEY = 'data';
const LOCAL_STORAGE_KEY = 'winter-arc:data';
const CORRUPT_COPY_PREFIX = 'winter-arc:unreadable-';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Could not open IndexedDB "${DB_NAME}": ${request.error?.message}`));
  });
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(new Error(`IndexedDB ${mode} failed: ${transaction.error?.message}`));
    });
  } finally {
    database.close();
  }
}

function readFromIndexedDb() {
  return runTransaction('readonly', (store) => store.get(RECORD_KEY));
}

function writeToIndexedDb(data) {
  return runTransaction('readwrite', (store) => store.put(data, RECORD_KEY));
}

function readFromLocalStorage() {
  const text = localStorage.getItem(LOCAL_STORAGE_KEY);
  return text === null ? undefined : JSON.parse(text);
}

function writeToLocalStorage(data) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Keeps a raw copy of stored data that failed validation, so a later save
 * never silently destroys it. It can be recovered manually from localStorage.
 */
function preserveUnreadableCopy(source, raw) {
  try {
    localStorage.setItem(`${CORRUPT_COPY_PREFIX}${source}-${Date.now()}`, JSON.stringify(raw));
  } catch (error) {
    console.error(`Could not preserve unreadable ${source} data`, error);
  }
}

async function readCandidate(source, read, warnings) {
  try {
    const raw = await read();
    if (raw === undefined) return null;
    const result = parseBackup(raw);
    if (result.isValid) return result.data;
    console.error(`Stored ${source} data failed validation`, result.errors);
    preserveUnreadableCopy(source, raw);
    warnings.push(`Saved data in ${source} was unreadable; a raw copy was kept.`);
  } catch (error) {
    console.error(`Reading ${source} failed`, error);
    warnings.push(`Could not read ${source}: ${error.message}`);
  }
  return null;
}

/**
 * Loads saved data, picking the most recently updated of the two copies.
 * @param {Date} now Used only when nothing is saved yet.
 * @returns {Promise<{ data: object, warnings: string[] }>}
 */
export async function loadData(now) {
  const warnings = [];
  const candidates = [
    await readCandidate('IndexedDB', readFromIndexedDb, warnings),
    await readCandidate('localStorage', readFromLocalStorage, warnings),
  ].filter(Boolean);

  if (candidates.length === 0) return { data: createEmptyData(now), warnings };
  candidates.sort((first, second) => (second.meta.updatedAt ?? '').localeCompare(first.meta.updatedAt ?? ''));
  return { data: candidates[0], warnings };
}

/**
 * Saves data to both stores. Succeeds if at least one store accepted it.
 * @param {object} data Mutated: meta.updatedAt is set.
 * @param {Date} now
 * @throws {Error} When neither store could save.
 */
export async function saveData(data, now) {
  data.meta.updatedAt = now.toISOString();
  const results = await Promise.allSettled([writeToIndexedDb(data), Promise.resolve().then(() => writeToLocalStorage(data))]);
  const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  failures.forEach((reason) => console.error('A storage write failed', reason));
  if (failures.length === results.length) {
    throw new Error(`Could not save your data anywhere: ${failures.map((reason) => reason.message).join('; ')}`);
  }
}

/**
 * Asks the browser not to evict this site's data under storage pressure.
 * @returns {Promise<'granted'|'denied'|'unsupported'>}
 */
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch (error) {
    console.error('Persistent storage request failed', error);
    return 'denied';
  }
}

/**
 * Downloads the data as a JSON backup file.
 * @param {object} data
 * @param {Date} now
 */
export function downloadBackup(data, now) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
