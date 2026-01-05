/**
 * Sync Module Tests
 *
 * Tests for SyncModule chunked sync and conflict resolution
 * Priority: HIGH - Core sync functionality (WP-3)
 */

// Mock P5Store before requiring sync-module
global.P5Store = {
  save: jest.fn(),
  load: jest.fn().mockReturnValue({ columns: {}, zones: [], issues: [] }),
  getDefaultData: jest.fn().mockReturnValue({ columns: {}, zones: [], issues: [] })
};

const { SyncModule, ConflictResolver, _internal } = require('../src/dashboard/js/sync-module');

// Mock fetch globally
global.fetch = jest.fn();

describe('Sync Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
    // Clear queue before each test
    _internal.clearQueue();
  });

  describe('resolveConflicts', () => {
    it('should keep local column if not on server', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'complete' }, updatedAt: '2026-01-05T10:00:00Z' }
      };
      const serverData = {};

      const result = _internal.resolveConflicts(localData, serverData);

      expect(result.resolved['A-X1']).toEqual(localData['A-X1']);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should include server-only columns in resolved', () => {
      const localData = {};
      const serverData = {
        'B-X1': { uid: 'B-X1', status: { code: 'pending' }, updatedAt: '2026-01-05T10:00:00Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      expect(result.resolved['B-X1']).toEqual(serverData['B-X1']);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should prefer server when timestamps are within 1 second', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'local' }, updatedAt: '2026-01-05T10:00:00.000Z' }
      };
      const serverData = {
        'A-X1': { uid: 'A-X1', status: { code: 'server' }, updatedAt: '2026-01-05T10:00:00.500Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      expect(result.resolved['A-X1'].status.code).toBe('server');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should use server data when server is newer (server_wins)', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'local' }, updatedAt: '2026-01-05T09:00:00Z' }
      };
      const serverData = {
        'A-X1': { uid: 'A-X1', status: { code: 'server' }, updatedAt: '2026-01-05T10:00:00Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      expect(result.resolved['A-X1'].status.code).toBe('server');
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('server_wins');
      expect(result.conflicts[0].reason).toBe('Server data is newer');
    });

    it('should use local data when local is newer (local_wins)', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'local' }, updatedAt: '2026-01-05T11:00:00Z' }
      };
      const serverData = {
        'A-X1': { uid: 'A-X1', status: { code: 'server' }, updatedAt: '2026-01-05T10:00:00Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      expect(result.resolved['A-X1'].status.code).toBe('local');
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('local_wins');
      expect(result.conflicts[0].reason).toBe('Local data is newer');
    });

    it('should handle multiple columns with mixed conflicts', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'local1' }, updatedAt: '2026-01-05T09:00:00Z' },
        'A-X2': { uid: 'A-X2', status: { code: 'local2' }, updatedAt: '2026-01-05T12:00:00Z' },
        'A-X3': { uid: 'A-X3', status: { code: 'local3' }, updatedAt: '2026-01-05T10:00:00Z' }
      };
      const serverData = {
        'A-X1': { uid: 'A-X1', status: { code: 'server1' }, updatedAt: '2026-01-05T10:00:00Z' },
        'A-X2': { uid: 'A-X2', status: { code: 'server2' }, updatedAt: '2026-01-05T10:00:00Z' },
        'A-X4': { uid: 'A-X4', status: { code: 'server4' }, updatedAt: '2026-01-05T10:00:00Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      // A-X1: server wins (server newer)
      expect(result.resolved['A-X1'].status.code).toBe('server1');
      // A-X2: local wins (local newer)
      expect(result.resolved['A-X2'].status.code).toBe('local2');
      // A-X3: local only, kept
      expect(result.resolved['A-X3'].status.code).toBe('local3');
      // A-X4: server only, added
      expect(result.resolved['A-X4'].status.code).toBe('server4');
      // 2 conflicts (A-X1 and A-X2)
      expect(result.conflicts).toHaveLength(2);
    });

    it('should handle missing updatedAt timestamps', () => {
      const localData = {
        'A-X1': { uid: 'A-X1', status: { code: 'local' } }
      };
      const serverData = {
        'A-X1': { uid: 'A-X1', status: { code: 'server' }, updatedAt: '2026-01-05T10:00:00Z' }
      };

      const result = _internal.resolveConflicts(localData, serverData);

      // Server wins because local has no timestamp (treated as 0)
      expect(result.resolved['A-X1'].status.code).toBe('server');
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('syncColumnsChunked', () => {
    it('should return error if API not configured', async () => {
      // Reset configuration
      _internal.configure({ apiUrl: '' });

      const result = await _internal.syncColumnsChunked({ 'A-X1': {} });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API not configured');
    });

    it('should chunk columns correctly', async () => {
      _internal.configure({
        apiUrl: 'https://example.com/api',
        chunkSize: 2
      });

      fetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      });

      const columns = {
        'A-X1': { uid: 'A-X1', status: { code: 'pending' } },
        'A-X2': { uid: 'A-X2', status: { code: 'pending' } },
        'A-X3': { uid: 'A-X3', status: { code: 'pending' } },
        'A-X4': { uid: 'A-X4', status: { code: 'pending' } },
        'A-X5': { uid: 'A-X5', status: { code: 'pending' } }
      };

      const result = await _internal.syncColumnsChunked(columns);

      // Should make 3 chunks (2+2+1)
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.totalChunks).toBe(3);
      expect(result.totalColumns).toBe(5);
    });

    it('should track progress correctly', async () => {
      const progressCallback = jest.fn();

      _internal.configure({
        apiUrl: 'https://example.com/api',
        chunkSize: 2,
        onProgress: progressCallback
      });

      fetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      });

      const columns = {
        'A-X1': { uid: 'A-X1' },
        'A-X2': { uid: 'A-X2' },
        'A-X3': { uid: 'A-X3' }
      };

      await _internal.syncColumnsChunked(columns);

      // Should call progress for each chunk
      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenLastCalledWith({
        current: 2,
        total: 2,
        percent: 100,
        processed: 3
      });
    });

    it('should handle chunk failures', async () => {
      _internal.configure({
        apiUrl: 'https://example.com/api',
        chunkSize: 2
      });

      fetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
        .mockRejectedValueOnce(new Error('Network error'));

      const columns = {
        'A-X1': { uid: 'A-X1' },
        'A-X2': { uid: 'A-X2' },
        'A-X3': { uid: 'A-X3' }
      };

      const result = await _internal.syncColumnsChunked(columns);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should collect conflicts from chunks', async () => {
      _internal.configure({
        apiUrl: 'https://example.com/api',
        chunkSize: 2
      });

      fetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: false,
          conflicts: [{ key: 'A-X1', reason: 'locked' }]
        })
      });

      const columns = {
        'A-X1': { uid: 'A-X1' },
        'A-X2': { uid: 'A-X2' }
      };

      const result = await _internal.syncColumnsChunked(columns);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].key).toBe('A-X1');
    });
  });

  describe('queueChange', () => {
    it('should add item to queue with correct structure', () => {
      _internal.clearQueue();

      const item = _internal.queueChange('updateColumn', { uid: 'A-X1', status: 'complete' });

      expect(item).toHaveProperty('id');
      expect(item.action).toBe('updateColumn');
      expect(item.payload).toEqual({ uid: 'A-X1', status: 'complete' });
      expect(item.status).toBe('pending');
      expect(item.retries).toBe(0);
      expect(item.timestamp).toBeDefined();
    });

    it('should generate unique IDs for each item', () => {
      _internal.clearQueue();

      const item1 = _internal.queueChange('action1', {});
      const item2 = _internal.queueChange('action2', {});

      expect(item1.id).not.toBe(item2.id);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', () => {
      _internal.clearQueue();
      _internal.queueChange('action1', {});
      _internal.queueChange('action2', {});

      const status = _internal.getQueueStatus();

      expect(status.pending).toBe(2);
      expect(status.failed).toBe(0);
      expect(status.total).toBe(2);
      expect(status.isSyncing).toBe(false);
    });
  });

  describe('clearQueue', () => {
    it('should clear all items from queue', () => {
      _internal.queueChange('action1', {});
      _internal.queueChange('action2', {});

      _internal.clearQueue();
      const status = _internal.getQueueStatus();

      expect(status.total).toBe(0);
    });
  });
});

describe('Conflict Resolver', () => {
  describe('showDialog', () => {
    it('should call onResolve with server data when server is locked', () => {
      const onResolve = jest.fn();
      const localData = { uid: 'A-X1', status: { code: 'local' } };
      const serverData = { uid: 'A-X1', status: { code: 'server' }, isLocked: true };

      ConflictResolver.showDialog(localData, serverData, onResolve);

      expect(onResolve).toHaveBeenCalledWith('server', serverData);
    });

    it('should call onResolve with local data when server is not locked', () => {
      const onResolve = jest.fn();
      const localData = { uid: 'A-X1', status: { code: 'local' } };
      const serverData = { uid: 'A-X1', status: { code: 'server' }, isLocked: false };

      ConflictResolver.showDialog(localData, serverData, onResolve);

      expect(onResolve).toHaveBeenCalledWith('local', localData);
    });
  });

  describe('mergeChanges', () => {
    it('should merge local status with server lock', () => {
      const local = { status: { code: 'in_progress' } };
      const server = { status: { code: 'pending', isLocked: true }, otherProp: 'value' };

      const result = ConflictResolver.mergeChanges(local, server);

      expect(result.status.code).toBe('in_progress');
      expect(result.status.isLocked).toBe(true);
      expect(result.otherProp).toBe('value');
    });
  });
});
