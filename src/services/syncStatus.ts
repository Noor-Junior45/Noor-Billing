export type SyncState = 'synced' | 'pending' | 'error';

type Subscriber = (state: SyncState, pendingCount: number, lastError?: string) => void;

let pendingCount = 0;
let lastError: string | undefined = undefined;
let currentState: SyncState = 'synced';
const subscribers: Set<Subscriber> = new Set();

function notify() {
  subscribers.forEach(cb => cb(currentState, pendingCount, lastError));
}

export function reportSyncStart(): void {
  pendingCount++;
  currentState = 'pending';
  notify();
}

export function reportSyncSuccess(): void {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) {
    currentState = 'synced';
  } else {
    currentState = 'pending';
  }
  notify();
}

export function reportSyncError(context: string, error: any): void {
  pendingCount = Math.max(0, pendingCount - 1);
  currentState = 'error';
  lastError = `[${context}] ${error?.message || error || 'Unknown sync error'}`;
  notify();
}

export function subscribeSyncStatus(cb: Subscriber): () => void {
  subscribers.add(cb);
  cb(currentState, pendingCount, lastError);
  return () => {
    subscribers.delete(cb);
  };
}
