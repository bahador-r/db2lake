import { describe, it, expect, vi } from "vitest";

// Mock mysql2/promise createConnection before importing the driver
const fakeConnection = {
  execute: vi.fn(),
  end: vi.fn(async () => {})
};

vi.mock('mysql2/promise', () => ({
  createConnection: vi.fn(async () => fakeConnection)
}));

import { MySQLSourceDriver } from './index';

describe('MySQLSourceDriver', () => {
  it('connects, fetches paginated rows, and closes', async () => {
    // Arrange: setup execute to return two pages then empty
    fakeConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]])
      .mockResolvedValueOnce([[]]);

    const config = {
      query: 'SELECT * FROM table WHERE id > ?',
      params: [0],
      cursorField: 'id',
      cursorParamsIndex: 0,
      connectionOptions: { host: 'localhost' }
    } as any;

    const driver = new MySQLSourceDriver(config);

    // Act: iterate through generator and collect rows
    const all: any[] = [];
    for await (const batch of driver.fetch()) {
      all.push(...batch);
    }

    // Assert: all rows collected
    expect(all.map(r => r.id)).toEqual([1,2,3]);
    // connect should have been called via createConnection mock
    const mysqlMock = (await import('mysql2/promise')) as any;
    expect(mysqlMock.createConnection).toHaveBeenCalled();

    // Close should call connection.end
    await driver.close();
    expect(fakeConnection.end).toHaveBeenCalled();
  });
});
