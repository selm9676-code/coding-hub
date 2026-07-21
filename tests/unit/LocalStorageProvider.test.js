import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '../../src/scripts/storage/LocalStorageProvider.js';

describe('LocalStorageProvider', () => {
  /** @type {LocalStorageProvider} */
  let provider;

  beforeEach(() => {
    localStorage.clear();
    provider = new LocalStorageProvider();
  });

  it('returns undefined for a missing key', async () => {
    const result = await provider.get('settings', 'settings');
    expect(result).toBeUndefined();
  });

  it('sets and gets a record', async () => {
    await provider.set('settings', 'settings', { theme: 'dark' });
    const result = await provider.get('settings', 'settings');
    expect(result).toEqual({ theme: 'dark' });
  });

  it('getAll returns all records in a store', async () => {
    await provider.set('progress', 'lesson-1', { lessonId: 'lesson-1', score: 90 });
    await provider.set('progress', 'lesson-2', { lessonId: 'lesson-2', score: 80 });
    const all = await provider.getAll('progress');
    expect(all).toHaveLength(2);
  });

  it('deletes a record', async () => {
    await provider.set('progress', 'lesson-1', { lessonId: 'lesson-1' });
    await provider.delete('progress', 'lesson-1');
    const result = await provider.get('progress', 'lesson-1');
    expect(result).toBeUndefined();
  });

  it('exports data with a schema version header', async () => {
    await provider.set('settings', 'settings', { theme: 'dark' });
    const exported = await provider.export();
    expect(exported.schemaVersion).toBe(1);
    expect(exported.stores.settings.settings).toEqual({ theme: 'dark' });
  });

  it('imports previously exported data', async () => {
    await provider.set('settings', 'settings', { theme: 'dark' });
    const exported = await provider.export();

    const freshProvider = new LocalStorageProvider();
    localStorage.clear();
    await freshProvider.import(exported);

    const result = await freshProvider.get('settings', 'settings');
    expect(result).toEqual({ theme: 'dark' });
  });

  it('rejects import of malformed data', async () => {
    await expect(provider.import(null)).rejects.toThrow();
    await expect(provider.import({})).rejects.toThrow();
    await expect(provider.import({ schemaVersion: 999, stores: {} })).rejects.toThrow();
  });
});
