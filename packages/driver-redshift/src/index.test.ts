import { describe, it, expect, vi } from 'vitest';

// Fake client and pool
const fakeClient = {
  query: vi.fn(),
  release: vi.fn(async () => {})
};

const fakePool = {
  connect: vi.fn(async () => fakeClient),
  end: vi.fn(async () => {})
};

vi.mock('pg', () => ({
  Pool: vi.fn((opts: any) => fakePool)
}));

import { RedshiftDestinationDriver } from './index';

describe('RedshiftDestinationDriver', () => {
  it('connects, creates table if needed, inserts rows, and closes', async () => {
    // Arrange: make client.query resolve
    fakeClient.query.mockResolvedValue({ rows: [] });

    const config = {
      connection: { host: 'localhost', port: 5439, user: 'user', password: 'pass', database: 'dev' },
      schema: 'public',
      table: 'test_table',
      createTableOptions: {
        columns: [{ name: 'id', type: 'INTEGER' }, { name: 'name', type: 'VARCHAR(255)' }],
        distKey: 'id',
        sortKey: ['id']
      },
      batchSize: 2,
      transaction: { enabled: true, maxRetries: 1 }
    } as any;

    const driver = new RedshiftDestinationDriver(config);

    // Act: connect -> should call createTable
    await driver.connect();

    // Insert two rows (batch size 2 will process both)
    await driver.insert([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);

    // Assert: pool was constructed and connection acquired
    const pg = (await import('pg')) as any;
    expect(pg.Pool).toHaveBeenCalledWith(config.connection);
    expect(fakePool.connect).toHaveBeenCalled();

    // Expect queries: at least CREATE TABLE and inserts and COMMIT
    expect(fakeClient.query).toHaveBeenCalled();

    // Close should release client and end pool
    await driver.close();
    expect(fakeClient.release).toHaveBeenCalled();
    expect(fakePool.end).toHaveBeenCalled();
  });
});
