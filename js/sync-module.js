/**
 * P5 Dashboard - Hybrid Sync Module
 *
 * Implements Optimistic UI pattern:
 * 1. Changes are applied to local state immediately
 * 2. Changes are queued for background sync
 * 3. Conflicts are detected and resolved
 *
 * @version 2.1 (Security Enhanced)
 */

const SyncModule = (function () {
  "use strict";

  // ===== Configuration =====
  const CONFIG = {
    API_URL: "", // Set via configure()
    API_KEY: "", // Optional: API key for authentication (Phase 10)
    SYNC_INTERVAL: 30000, // 30 seconds
    RETRY_DELAY: 5000,
    MAX_RETRIES: 3,
    QUEUE_KEY: "p5_sync_queue",
    LAST_SYNC_KEY: "p5_last_sync",
    // WP-3: Chunked Sync Configuration
    CHUNK_SIZE: 500,      // Max columns per sync request
    CHUNK_DELAY: 1000,    // Delay between chunks (ms)
    TIMEOUT_BUFFER: 300000, // 5 minutes (GAS limit is 6 min)
  };

  // ===== State =====
  let syncQueue = [];
  let isSyncing = false;
  let syncInterval = null;
  let onConflict = null;
  let onSyncComplete = null;
  let onSyncError = null;
  let onProgress = null;  // WP-3: Progress callback

  // ===== Public API =====


  /**
   * Initialize the sync module
   * @param {object} options - Configuration options
   */
  function configure(options) {
    if (options.apiUrl) CONFIG.API_URL = options.apiUrl;
    if (options.apiKey) CONFIG.API_KEY = options.apiKey; // Phase 10: API Key 지원
    if (options.syncInterval) CONFIG.SYNC_INTERVAL = options.syncInterval;
    if (options.chunkSize) CONFIG.CHUNK_SIZE = options.chunkSize; // WP-3
    if (options.onConflict) onConflict = options.onConflict;
    if (options.onSyncComplete) onSyncComplete = options.onSyncComplete;
    if (options.onSyncError) onSyncError = options.onSyncError;
    if (options.onProgress) onProgress = options.onProgress; // WP-3

    // Load pending queue from storage
    loadQueue();

    console.log(
      "[SyncModule] Configured with API:",
      CONFIG.API_URL,
      CONFIG.API_KEY ? "(with API key)" : "(no API key)"
    );
  }

  /**
   * Start automatic background sync
   */
  function startAutoSync() {
    if (syncInterval) return;

    syncInterval = setInterval(() => {
      processQueue();
    }, CONFIG.SYNC_INTERVAL);

    console.log("[SyncModule] Auto-sync started");
  }

  /**
   * Stop automatic background sync
   */
  function stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    console.log("[SyncModule] Auto-sync stopped");
  }

  /**
   * Queue a change for sync (Optimistic Update)
   * @param {string} action - Action type (updateColumn, bulkUpdate, etc.)
   * @param {object} payload - Action payload
   * @returns {object} - Queue item with ID
   */
  function queueChange(action, payload) {
    const item = {
      id: generateId(),
      action,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: "pending",
    };

    syncQueue.push(item);
    saveQueue();

    console.log("[SyncModule] Queued:", action, item.id);
    return item;
  }

  /**
   * Immediately process the sync queue
   * @returns {Promise} - Sync result
   */
  async function syncNow() {
    if (!CONFIG.API_URL) {
      console.warn("[SyncModule] API URL not configured");
      return { success: false, error: "API not configured" };
    }

    return processQueue();
  }

  /**
   * Fetch latest data from server
   * @returns {Promise<object>} - Full dashboard data
   */
  async function fetchFromServer() {
    if (!CONFIG.API_URL) {
      return { success: false, error: "API not configured" };
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getFullData`);
      const data = await response.json();

      if (data.success) {
        localStorage.setItem(CONFIG.LAST_SYNC_KEY, data.timestamp);
      }

      return data;
    } catch (error) {
      console.error("[SyncModule] Fetch failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current queue status
   * @returns {object} - Queue status
   */
  function getQueueStatus() {
    return {
      pending: syncQueue.filter((i) => i.status === "pending").length,
      failed: syncQueue.filter((i) => i.status === "failed").length,
      total: syncQueue.length,
      isSyncing,
      lastSync: localStorage.getItem(CONFIG.LAST_SYNC_KEY),
    };
  }

  /**
   * Clear all pending items (use with caution)
   */
  function clearQueue() {
    syncQueue = [];
    saveQueue();
    console.log("[SyncModule] Queue cleared");
  }

  // ===== WP-3: Chunked Sync Functions =====

  /**
   * Sync large column datasets in chunks to prevent GAS timeout
   * @param {Object} columns - Column data object (can have 8,000+ entries)
   * @returns {Promise<Object>} - Sync results
   */
  async function syncColumnsChunked(columns) {
    if (!CONFIG.API_URL) {
      return { success: false, error: "API not configured" };
    }

    const columnArray = Object.entries(columns);
    const totalChunks = Math.ceil(columnArray.length / CONFIG.CHUNK_SIZE);
    const timestamp = new Date().toISOString();

    console.log(`[SyncModule] Starting chunked sync: ${columnArray.length} columns in ${totalChunks} chunks`);

    const results = {
      success: true,
      totalColumns: columnArray.length,
      totalChunks,
      processed: 0,
      failed: 0,
      conflicts: [],
      startTime: Date.now()
    };

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CONFIG.CHUNK_SIZE;
      const end = Math.min(start + CONFIG.CHUNK_SIZE, columnArray.length);
      const chunkData = Object.fromEntries(columnArray.slice(start, end));

      try {
        const response = await sendChunk(chunkData, i + 1, totalChunks, timestamp);

        if (response.success) {
          results.processed += Object.keys(chunkData).length;
        } else if (response.conflicts) {
          results.conflicts.push(...response.conflicts);
        } else {
          results.failed += Object.keys(chunkData).length;
        }

        // Progress callback
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: totalChunks,
            percent: progress,
            processed: results.processed
          });
        }

        console.log(`[SyncModule] Chunk ${i + 1}/${totalChunks} complete (${progress}%)`);

        // Delay between chunks to prevent rate limiting
        if (i < totalChunks - 1) {
          await delay(CONFIG.CHUNK_DELAY);
        }

      } catch (error) {
        console.error(`[SyncModule] Chunk ${i + 1} failed:`, error);
        results.failed += Object.keys(chunkData).length;
        results.success = false;
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    console.log(`[SyncModule] Chunked sync complete in ${results.duration}ms:`, results);

    if (onSyncComplete) {
      onSyncComplete(results);
    }

    return results;
  }

  /**
   * Send a single chunk to server
   */
  async function sendChunk(chunkData, chunkIndex, totalChunks, timestamp) {
    const requestBody = {
      action: "syncChunk",
      chunk: chunkData,
      chunkIndex,
      totalChunks,
      timestamp,
      user: "dashboard"
    };

    if (CONFIG.API_KEY) {
      requestBody.apiKey = CONFIG.API_KEY;
    }

    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    return response.json();
  }

  /**
   * Resolve conflicts between local and server data (timestamp-based)
   * @param {Object} localData - Local column data
   * @param {Object} serverData - Server column data
   * @returns {Object} - Resolved conflicts
   */
  function resolveConflicts(localData, serverData) {
    const conflicts = [];
    const resolved = {};

    for (const [key, localColumn] of Object.entries(localData)) {
      const serverColumn = serverData[key];

      if (!serverColumn) {
        // New local column, keep it
        resolved[key] = localColumn;
        continue;
      }

      const localTime = new Date(localColumn.updatedAt || 0).getTime();
      const serverTime = new Date(serverColumn.updatedAt || 0).getTime();

      if (Math.abs(localTime - serverTime) < 1000) {
        // Within 1 second, consider them the same
        resolved[key] = serverColumn;
      } else if (serverTime > localTime) {
        // Server wins - newer timestamp
        conflicts.push({
          key,
          resolution: "server_wins",
          localValue: localColumn,
          serverValue: serverColumn,
          reason: "Server data is newer"
        });
        resolved[key] = serverColumn;
      } else {
        // Local wins - newer timestamp
        conflicts.push({
          key,
          resolution: "local_wins",
          localValue: localColumn,
          serverValue: serverColumn,
          reason: "Local data is newer"
        });
        resolved[key] = localColumn;
      }
    }

    // Include server-only columns
    for (const [key, serverColumn] of Object.entries(serverData)) {
      if (!localData[key]) {
        resolved[key] = serverColumn;
      }
    }

    return { resolved, conflicts };
  }

  /**
   * Utility: Delay execution
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Internal Functions =====


  /**
   * Process the sync queue
   */
  async function processQueue() {
    if (isSyncing || syncQueue.length === 0)
      return { success: true, processed: 0 };

    isSyncing = true;
    const results = { success: 0, failed: 0, conflicts: 0 };

    console.log("[SyncModule] Processing queue:", syncQueue.length, "items");

    for (const item of syncQueue.filter((i) => i.status === "pending")) {
      try {
        const result = await sendToServer(item.action, item.payload);

        if (result.success) {
          item.status = "completed";
          results.success++;
        } else if (result.isLocked || result.conflict) {
          item.status = "conflict";
          results.conflicts++;

          if (onConflict) {
            onConflict(item, result);
          }
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (error) {
        item.retries++;

        if (item.retries >= CONFIG.MAX_RETRIES) {
          item.status = "failed";
          results.failed++;

          if (onSyncError) {
            onSyncError(item, error);
          }
        }

        console.error("[SyncModule] Sync error:", error);
      }
    }

    // Remove completed items
    syncQueue = syncQueue.filter((i) => i.status !== "completed");
    saveQueue();

    isSyncing = false;

    if (onSyncComplete) {
      onSyncComplete(results);
    }

    console.log("[SyncModule] Sync complete:", results);
    return results;
  }

  /**
   * Send action to server (보안 강화)
   * @param {string} action - Action type
   * @param {object} payload - Payload data
   */
  async function sendToServer(action, payload) {
    // API Key 포함 (Phase 10 Security)
    const requestBody = {
      action,
      ...payload,
    };
    
    // API Key가 설정된 경우 포함
    if (CONFIG.API_KEY) {
      requestBody.apiKey = CONFIG.API_KEY;
    }
    
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    return response.json();
  }

  /**
   * Save queue to localStorage
   */
  function saveQueue() {
    try {
      localStorage.setItem(CONFIG.QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (e) {
      console.error("[SyncModule] Failed to save queue:", e);
    }
  }

  /**
   * Load queue from localStorage
   */
  function loadQueue() {
    try {
      const saved = localStorage.getItem(CONFIG.QUEUE_KEY);
      if (saved) {
        syncQueue = JSON.parse(saved);
        // Reset status of stuck items
        syncQueue.forEach((item) => {
          if (item.status === "syncing") {
            item.status = "pending";
          }
        });
      }
    } catch (e) {
      console.error("[SyncModule] Failed to load queue:", e);
      syncQueue = [];
    }
  }

  /**
   * Generate unique ID
   */
  function generateId() {
    return "sync_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // ===== Expose Public API =====
  return {
    configure,
    startAutoSync,
    stopAutoSync,
    queueChange,
    syncNow,
    fetchFromServer,
    getQueueStatus,
    clearQueue,
    // WP-3: Chunked Sync
    syncColumnsChunked,
    resolveConflicts,
  };
})();

/**
 * P5 Dashboard - Conflict Resolver
 *
 * Handles sync conflicts with user interaction
 */
const ConflictResolver = (function () {
  "use strict";

  /**
   * Show conflict resolution dialog
   * @param {object} localData - Local version
   * @param {object} serverData - Server version
   * @param {function} onResolve - Callback with resolution choice
   */
  function showDialog(localData, serverData, onResolve) {
    // In a real implementation, this would show a modal
    // For now, we use server-wins strategy for locked items

    console.log("[ConflictResolver] Conflict detected:", {
      local: localData,
      server: serverData,
    });

    // Default strategy: Server wins if locked, otherwise local wins
    if (serverData.isLocked) {
      onResolve("server", serverData);
    } else {
      onResolve("local", localData);
    }
  }

  /**
   * Merge changes (for advanced conflict resolution)
   * @param {object} local - Local data
   * @param {object} server - Server data
   * @returns {object} - Merged data
   */
  function mergeChanges(local, server) {
    // Simple merge: prefer local non-null values, keep server Lock status
    return {
      ...server,
      status: {
        ...server.status,
        code: local.status.code, // Use local status
        isLocked: server.status.isLocked, // Keep server lock
      },
    };
  }

  return {
    showDialog,
    mergeChanges,
  };
})();

// ===== Dashboard Integration =====

/**
 * Enhanced P5Store with Sync support
 */
const P5SyncStore = {
  ...P5Store, // Inherit from base store

  isOnline: true,
  apiConfigured: false,

  /**
   * Initialize with API
   * @param {string} apiUrl - Apps Script Web App URL
   */
  async initWithApi(apiUrl) {
    // Configure sync module
    SyncModule.configure({
      apiUrl,
      onSyncComplete: (results) => {
        console.log("[P5SyncStore] Sync complete:", results);
        this.showSyncStatus(results);
      },
      onConflict: (item, result) => {
        console.warn("[P5SyncStore] Conflict:", item.payload.uid, result);
      },
      onSyncError: (item, error) => {
        console.error("[P5SyncStore] Error:", item.payload.uid, error);
      },
    });

    this.apiConfigured = true;

    // Try to fetch initial data from server
    try {
      const serverData = await SyncModule.fetchFromServer();
      if (serverData.success) {
        return serverData;
      }
    } catch (e) {
      console.warn(
        "[P5SyncStore] Failed to fetch from server, using local data"
      );
    }

    // Fallback to local data
    return this.load();
  },

  /**
   * Save with sync (Optimistic Update)
   * @param {object} data - Data to save
   */
  saveWithSync(data) {
    // 1. Save locally immediately (Optimistic)
    this.save(data);

    // 2. Queue for background sync
    if (this.apiConfigured && this.isOnline) {
      SyncModule.queueChange("syncFromLocal", {
        data: { columns: data.columns },
        user: "dashboard",
      });
    }
  },

  /**
   * Update single column with sync
   * @param {string} uid - Column UID
   * @param {object} changes - Changes to apply
   */
  updateColumnWithSync(uid, changes) {
    // 1. Update local state
    const data = this.load();
    if (data.columns[uid]) {
      Object.assign(data.columns[uid].status, changes);
      data.columns[uid].status.updatedAt = new Date().toISOString();
      data.columns[uid].status.source = "admin";
      this.save(data);
    }

    // 2. Queue for sync
    if (this.apiConfigured && this.isOnline) {
      SyncModule.queueChange("updateColumn", {
        uid,
        data: changes,
        user: "dashboard",
      });
    }
  },

  /**
   * Bulk update with sync
   * @param {string[]} uids - Column UIDs
   * @param {object} changes - Common changes
   */
  bulkUpdateWithSync(uids, changes) {
    // 1. Update local state
    const data = this.load();
    for (const uid of uids) {
      if (data.columns[uid]) {
        Object.assign(data.columns[uid].status, changes);
        data.columns[uid].status.updatedAt = new Date().toISOString();
        data.columns[uid].status.source = "admin";
      }
    }
    this.save(data);

    // 2. Queue for sync
    if (this.apiConfigured && this.isOnline) {
      SyncModule.queueChange("bulkUpdate", {
        uids,
        data: changes,
        user: "dashboard",
      });
    }
  },

  /**
   * Force sync now
   */
  async forceSyncNow() {
    return SyncModule.syncNow();
  },

  /**
   * Get sync status for UI
   */
  getSyncStatus() {
    return SyncModule.getQueueStatus();
  },

  /**
   * Show sync status notification (to be overridden by UI)
   */
  showSyncStatus(results) {
    console.log("[P5SyncStore] Sync status:", results);
  },
};

// Make globally available
if (typeof window !== "undefined") {
  window.SyncModule = SyncModule;
  window.ConflictResolver = ConflictResolver;
  window.P5SyncStore = P5SyncStore;
}
