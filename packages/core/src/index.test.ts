import { describe, it, expect } from "vitest";
import { Pipeline } from "./pipeline";
import { ISourceDriver, IDestinationDriver } from "./driver.type";

class MockSource implements ISourceDriver<number> {
  private connected = false;
  async connect(): Promise<void> { this.connected = true; }
  async *fetch(): AsyncGenerator<number[], void, unknown> {
    yield [1, 2];
    yield [3];
  }
  async close(): Promise<void> { this.connected = false; }
}

class MockDestination implements IDestinationDriver<number> {
  public inserted: number[] = [];
  async connect(): Promise<void> { /* noop */ }
  async insert(rows: number[]): Promise<void> { this.inserted.push(...rows); }
  async close(): Promise<void> { /* noop */ }
}

class TestPipeline extends Pipeline {}

describe("IPipeline (core)", () => {
  it("processes batches, applies transformer, and updates metrics", async () => {
    const source = new MockSource();
    const dest = new MockDestination();
    const transformer = (data: number[]) => data.map((n) => n * 2);
    const logs: Array<any> = [];
    const logger = (level: string, message: string, data?: any) => logs.push({ level, message, data });

    const pipeline = new TestPipeline(source, dest, transformer, logger);
    await pipeline.run();

    // destination should have the transformed rows
    expect(dest.inserted).toEqual([2, 4, 6]);

    const metrics = pipeline.getMetrics();
    expect(metrics.batchCount).toBe(2);
    expect(metrics.totalRows).toBe(3);
    expect(metrics.cursor).not.toBeNull();

    // expect at least one info log about completion
    expect(logs.some((l) => l.level === "info" && /Data processing completed/.test(l.message))).toBe(true);
  });
});
