import { describe, it, expect, vi } from 'vitest';

// Fake client and connection
const fakeConnection = {
  execute: vi.fn(),
  close: vi.fn(async () => {})
};

const fakeClient = {
  connect: vi.fn(async (opts: any) => fakeConnection),
  close: vi.fn(async () => {})
};

vi.mock('@databricks/sql', () => ({
  DBSQLClient: vi.fn(() => fakeClient)
}));

import { DatabricksDestinationDriver } from './index';

describe('DatabricksDestinationDriver', () => {
  it('connects, buffers rows, flushes on batch size, and closes', async () => {
    // Arrange: make execute succeed
    fakeConnection.execute.mockResolvedValueOnce([true]);

    const config = {
      connection: { host: 'host', path: '/sql/1', token: 'tok' },
      database: 'db',
      table: 'tbl',
      batchSize: 2,
      createTableOptions: {
        schema: [{ name: 'id', type: 'INT' }]
      }
    } as any;

    const driver = new DatabricksDestinationDriver(config);

    // Act: insert two rows (should trigger flush on second insert)
    await driver.insert([{ id: 1 }]);
    await driver.insert([{ id: 2 }]);

    // Assert: execute called for create table and insert
    expect(fakeClient.connect).toHaveBeenCalled();
    expect(fakeConnection.execute).toHaveBeenCalled();

    // Close should flush any remaining rows (none) and close resources
    await driver.close();
    expect(fakeConnection.close).toHaveBeenCalled();
    expect(fakeClient.close).toHaveBeenCalled();
  });
});
