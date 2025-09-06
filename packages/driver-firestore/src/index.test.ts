import { describe, it, expect, vi } from 'vitest';

// Prepare a paginated query mock factory
function makeQueryMock(pages: Array<Array<any>>) {
  let callIndex = -1;
  const query = {
    where: (_f: any, _op: any, _v: any) => query,
    orderBy: (_f: any, _d: any) => query,
    startAt: (..._v: any[]) => query,
    startAfter: (_doc: any) => query,
    endBefore: (..._v: any[]) => query,
    endAt: (..._v: any[]) => query,
    limit: (_n: number) => query,
    get: async () => {
      callIndex++;
      const docs = (pages[callIndex] || []).map((d: any, i: number) => ({
        id: d.id != null ? String(d.id) : String(i),
        data: () => d
      }));
      return { docs };
    }
  };
  return query;
}

// Mock firebase-admin modules before importing the driver
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn((opts?: any, name?: string) => ({ opts, name }))
}));

// We'll mock getFirestore to return an object with collection(name) => queryMock
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    // collection will be replaced in the test to use a per-test query mock
  }))
}));

describe('FirestoreSourceDriver', () => {
  it('fetches paginated batches and terminates on close', async () => {
    // Arrange: create pages (two pages: 2 docs then 1 doc)
    const pages = [
      [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ],
      [ { id: 'c', value: 3 } ]
    ];

    const queryMock = makeQueryMock(pages);

    // Mock getFirestore to return a db with collection returning our queryMock
    const firestore = {
      collection: vi.fn(() => queryMock),
      terminate: vi.fn(async () => {})
    };

    // Replace the mocked module's getFirestore to return our firestore instance
    const firestoreModule = await import('firebase-admin/firestore');
    // @ts-ignore
    firestoreModule.getFirestore = vi.fn(() => firestore);

    // Import the driver after mocks set up
    const mod = await import('./index');
    const { FirestoreSourceDriver } = mod;

    const config = {
      appOptions: {},
      collection: 'users',
      limit: 2
    } as any;

    const driver = new FirestoreSourceDriver(config);

    // Act: collect all batches
    const all: any[] = [];
    for await (const batch of driver.fetch()) {
      all.push(...batch);
    }

    // Assert: we received 3 documents in order
    expect(all.map((r: any) => r.id)).toEqual(['a','b','c']);

    // Close driver and assert terminate called
    await driver.close();
    expect(firestore.terminate).toHaveBeenCalled();
  });
});
