import { describe, it, expect, vi } from 'vitest';

// Create fake client and pool and mock 'pg' before importing the driver
const fakeClient = {
  query: vi.fn(),
  release: vi.fn(async () => {})
};

const fakePool = {
  connect: vi.fn(async () => fakeClient),
  end: vi.fn(async () => {})
};

vi.mock('pg', () => ({
  Pool: vi.fn((poolConfig?: any) => fakePool)
}));

import { PostgresSourceDriver } from './index';

describe('PostgresSourceDriver', () => {
  it('connects, fetches paginated rows, and closes', async () => {
    // Arrange: return two pages then empty
    fakeClient.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] });

    const config = {
      query: 'SELECT * FROM table WHERE id > $1',
      params: [0],
      cursorField: 'id',
      cursorParamsIndex: 0,
      poolConfig: { connectionString: 'postgres://user:pass@localhost:5432/db' }
    } as any;

    const driver = new PostgresSourceDriver(config);

    // Act: iterate generator and collect
    const all: any[] = [];
    for await (const batch of driver.fetch()) {
      all.push(...batch);
    }

    // Assert: collected rows
    expect(all.map(r => r.id)).toEqual([1, 2, 3]);

    // Pool constructor should have been called with poolConfig
    const pg = (await import('pg')) as any;
    expect(pg.Pool).toHaveBeenCalledWith(config.poolConfig);

    // Close should release client and end pool
    await driver.close();
    expect(fakeClient.release).toHaveBeenCalled();
    expect(fakePool.end).toHaveBeenCalled();
  });
});
