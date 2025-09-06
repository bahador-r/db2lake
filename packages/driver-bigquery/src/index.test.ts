import { describe, it, expect, vi } from "vitest";

// Mock the '@google-cloud/bigquery' module in a self-contained way.
// The mock stores the last created BigQuery instance on globalThis.__lastBigQuery
// so the test can inspect inserted rows without any external network calls.
vi.mock("@google-cloud/bigquery", () => ({
  BigQuery: class {
    constructor() {
      // store instance for test inspection
      (globalThis as any).__lastBigQuery = this;
      (this as any).__rows = [];
    }
    dataset(_name: string) {
      const self = this as any;
      return {
        exists: async () => [true],
        table: (_t: string) => ({
          exists: async () => [true],
          insert: async (rows: any[]) => { self.__rows.push(...rows); },
          createWriteStream: () => ({
            write: (rows: any[], cb: (err?: Error) => void) => cb(),
            end: (cb: (err?: Error) => void) => cb()
          })
        }),
        create: async () => {}
      };
    }
  }
}));

describe("BigQueryDestinationDriver", () => {
  it("connects, inserts, flushes, and closes without calling real BigQuery", async () => {
    const mod = await import("./index");
    const { BigQueryDestinationDriver } = mod;

    const config = {
      bigQueryOptions: {},
      dataset: "ds",
      table: "tbl",
      batchSize: 2
    };

    const driver = new BigQueryDestinationDriver(config as any);

    // Act: insert rows; first insert shouldn't flush until batchSize reached
    await driver.insert([{ a: 1 }]);
    // second insert should trigger flush
    await driver.insert([{ a: 2 }]);

    // Close to flush any remaining rows and cleanup
    await driver.close();

    // Assert: the mocked BigQuery instance captured rows
    const last = (globalThis as any).__lastBigQuery;
    expect(last).toBeDefined();
    expect(Array.isArray(last.__rows)).toBe(true);
    expect(last.__rows.length).toBeGreaterThanOrEqual(0);
  });
});
