// IndexedDB wrapper for offline data storage
const DB_NAME = 'entirecafm-pwa';
const DB_VERSION = 1;

const STORES = {
  JOBS: 'jobs',
  PENDING_UPDATES: 'pending_updates',
  TIME_ENTRIES: 'time_entries',
  PARTS_LOG: 'parts_log',
  PHOTOS: 'photos'
};

let db = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Jobs store - cache job details for offline access
      if (!database.objectStoreNames.contains(STORES.JOBS)) {
        const jobsStore = database.createObjectStore(STORES.JOBS, { keyPath: 'id' });
        jobsStore.createIndex('status', 'status', { unique: false });
        jobsStore.createIndex('assigned_engineer_id', 'assigned_engineer_id', { unique: false });
      }

      // Pending updates - queue status changes when offline
      if (!database.objectStoreNames.contains(STORES.PENDING_UPDATES)) {
        const updatesStore = database.createObjectStore(STORES.PENDING_UPDATES, { keyPath: 'id', autoIncrement: true });
        updatesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Time entries - log work time offline
      if (!database.objectStoreNames.contains(STORES.TIME_ENTRIES)) {
        const timeStore = database.createObjectStore(STORES.TIME_ENTRIES, { keyPath: 'id', autoIncrement: true });
        timeStore.createIndex('job_id', 'job_id', { unique: false });
        timeStore.createIndex('synced', 'synced', { unique: false });
      }

      // Parts log - track parts used offline
      if (!database.objectStoreNames.contains(STORES.PARTS_LOG)) {
        const partsStore = database.createObjectStore(STORES.PARTS_LOG, { keyPath: 'id', autoIncrement: true });
        partsStore.createIndex('job_id', 'job_id', { unique: false });
        partsStore.createIndex('synced', 'synced', { unique: false });
      }

      // Photos - store photos as blobs for offline
      if (!database.objectStoreNames.contains(STORES.PHOTOS)) {
        const photosStore = database.createObjectStore(STORES.PHOTOS, { keyPath: 'id', autoIncrement: true });
        photosStore.createIndex('job_id', 'job_id', { unique: false });
        photosStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
};

// Generic CRUD operations
const getStore = (storeName, mode = 'readonly') => {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

export const saveItem = async (storeName, item) => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getItem = async (storeName, id) => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllItems = async (storeName) => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (storeName, id) => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearStore = async (storeName) => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Job-specific operations
export const cacheJobs = async (jobs) => {
  await initDB();
  const store = getStore(STORES.JOBS, 'readwrite');
  jobs.forEach(job => store.put(job));
};

export const getCachedJobs = () => getAllItems(STORES.JOBS);

export const getCachedJob = (id) => getItem(STORES.JOBS, id);

// Pending updates queue
export const queueUpdate = async (update) => {
  const pendingUpdate = {
    ...update,
    timestamp: Date.now(),
    synced: false
  };
  return saveItem(STORES.PENDING_UPDATES, pendingUpdate);
};

export const getPendingUpdates = () => getAllItems(STORES.PENDING_UPDATES);

export const markUpdateSynced = async (id) => {
  return deleteItem(STORES.PENDING_UPDATES, id);
};

// Time entry operations
export const saveTimeEntry = async (entry) => {
  const timeEntry = {
    ...entry,
    synced: false,
    created_at: Date.now()
  };
  return saveItem(STORES.TIME_ENTRIES, timeEntry);
};

export const getTimeEntries = (jobId) => {
  return getAllItems(STORES.TIME_ENTRIES).then(entries => 
    jobId ? entries.filter(e => e.job_id === jobId) : entries
  );
};

export const getUnsyncedTimeEntries = () => {
  return getAllItems(STORES.TIME_ENTRIES).then(entries => 
    entries.filter(e => !e.synced)
  );
};

// Parts log operations
export const savePartsLog = async (entry) => {
  const partsEntry = {
    ...entry,
    synced: false,
    created_at: Date.now()
  };
  return saveItem(STORES.PARTS_LOG, partsEntry);
};

export const getPartsLog = (jobId) => {
  return getAllItems(STORES.PARTS_LOG).then(entries => 
    jobId ? entries.filter(e => e.job_id === jobId) : entries
  );
};

// Photo operations
export const savePhoto = async (jobId, photoBlob, metadata = {}) => {
  const photoEntry = {
    job_id: jobId,
    blob: photoBlob,
    metadata,
    synced: false,
    created_at: Date.now()
  };
  return saveItem(STORES.PHOTOS, photoEntry);
};

export const getJobPhotos = (jobId) => {
  return getAllItems(STORES.PHOTOS).then(photos => 
    photos.filter(p => p.job_id === jobId)
  );
};

export const getUnsyncedPhotos = () => {
  return getAllItems(STORES.PHOTOS).then(photos => 
    photos.filter(p => !p.synced)
  );
};

export { STORES };