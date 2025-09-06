import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake Snowflake connection and execute handler
const fakeExecute = vi.fn((opts: any) => {
	const complete = opts && opts.complete;
	// simulate async callback successful response
	if (typeof complete === 'function') {
		setTimeout(() => complete(null, { /* stmt */ }, []), 0);
	}
});

const fakeConnection: any = {
	connect: vi.fn((cb: any) => cb && cb(null, fakeConnection)),
	execute: fakeExecute,
	destroy: vi.fn((cb: any) => cb && cb(null))
};

vi.mock('snowflake-sdk', () => ({
	createConnection: vi.fn((opts: any) => fakeConnection)
}));

import { SnowflakeDestinationDriver } from './index';

describe('SnowflakeDestinationDriver', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('connects, creates table if needed, inserts rows, and closes', async () => {
		const config = {
			connection: {
				account: 'acct',
				username: 'user',
				password: 'pass',
				database: 'db',
				warehouse: 'wh',
				schema: 'PUBLIC'
			},
			table: {
				table: 'test_table',
				schema: 'PUBLIC',
				createIfNotExists: true,
				columns: [
					{ name: 'id', type: 'NUMBER' },
					{ name: 'name', type: 'VARCHAR' }
				]
			},
			batch: { size: 2, maxRetries: 1, retryDelay: 10 },
			transaction: { enabled: true, queryTimeout: 60, maxParallelStatements: 1 }
		} as any;

		const driver = new SnowflakeDestinationDriver(config);

		// Connect should create and connect the connection
		await driver.connect();

		const sf = (await import('snowflake-sdk')) as any;
		expect(sf.createConnection).toHaveBeenCalledWith(expect.objectContaining({
			account: 'acct',
			username: 'user',
			password: 'pass',
			database: 'db',
			warehouse: 'wh',
			schema: 'PUBLIC'
		}));

		// Insert a couple of rows (batch size 2)
		await driver.insert([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);

		// execute should have been called for CREATE TABLE and for inserts and transaction commands
		expect(fakeExecute).toHaveBeenCalled();

		const calls = fakeExecute.mock.calls.map(c => (c[0] && c[0].sqlText ? String(c[0].sqlText).trim() : ''));
		const hasBegin = calls.some(sql => /BEGIN/i.test(sql));
		const hasCommit = calls.some(sql => /COMMIT/i.test(sql));
		expect(hasBegin).toBe(true);
		expect(hasCommit).toBe(true);

		// Close should call destroy
		await driver.close();
		expect(fakeConnection.destroy).toHaveBeenCalled();
	});
});

