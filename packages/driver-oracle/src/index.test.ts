import { describe, it, expect, vi } from 'vitest';

// Fake connection and pool
const fakeConnection = {
  execute: vi.fn(),
  close: vi.fn(async () => {})
};

const fakePool = {
  getConnection: vi.fn(async () => fakeConnection),
  close: vi.fn(async () => {})
};

vi.mock('oracledb', () => {
  const mod = {
    OUT_FORMAT_OBJECT: Symbol('OUT_FORMAT_OBJECT'),
    createPool: vi.fn(async (attrs: any) => fakePool)
  } as any;
  // Return both named exports and a default export to match how the real module is imported
  return { default: mod, ...mod };
});

import { OracleSourceDriver } from './index';

describe('OracleSourceDriver', () => {
  it('connects, fetches paginated rows, and closes', async () => {
    // Arrange: execute returns two pages then empty
    fakeConnection.execute
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] });

    const config = {
      query: 'SELECT * FROM table WHERE id > :id',
      params: [0],
      cursorField: 'id',
      cursorParamsIndex: 0,
      poolAttributes: { user: 'test' }
    } as any;

    const driver = new OracleSourceDriver(config);

    // Act: iterate generator and collect
    const all: any[] = [];
    for await (const batch of driver.fetch()) {
      all.push(...batch);
    }

    // Assert: collected rows
    expect(all.map(r => r.id)).toEqual([1, 2, 3]);

    // Pool created with poolAttributes
    const oracledb = (await import('oracledb')) as any;
    expect(oracledb.createPool).toHaveBeenCalledWith(config.poolAttributes);

    // Close should close connection and pool
    await driver.close();
    expect(fakeConnection.close).toHaveBeenCalled();
    expect(fakePool.close).toHaveBeenCalled();
  });
});
