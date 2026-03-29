// Sync manager for offline data synchronization
import { base44 } from "@/api/base44Client";
import {
  getPendingUpdates,
  markUpdateSynced,
  getUnsyncedTimeEntries,
  getUnsyncedPhotos,
  saveItem,
  deleteItem,
  STORES
} from "./OfflineStorage";

let syncInProgress = false;

export const syncPendingUpdates = async () => {
  if (syncInProgress || !navigator.onLine) return { synced: 0, failed: 0 };
  
  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    // Sync job status updates
    const pendingUpdates = await getPendingUpdates();
    
    for (const update of pendingUpdates) {
      try {
        if (update.type === 'job_status') {
          await base44.entities.Job.update(update.job_id, update.data);
          await markUpdateSynced(update.id);
          synced++;
        } else if (update.type === 'time_entry') {
          await base44.entities.TimeEntry.create(update.data);
          await markUpdateSynced(update.id);
          synced++;
        } else if (update.type === 'parts_used') {
          await base44.entities.Expense.create(update.data);
          await markUpdateSynced(update.id);
          synced++;
        }
      } catch (error) {
        console.error('Failed to sync update:', update.id, error);
        failed++;
      }
    }

    // Sync time entries
    const unsyncedTimeEntries = await getUnsyncedTimeEntries();
    for (const entry of unsyncedTimeEntries) {
      try {
        await base44.entities.TimeEntry.create({
          job_id: entry.job_id,
          engineer_id: entry.engineer_id,
          start_time: new Date(entry.start_time).toISOString(),
          end_time: entry.end_time ? new Date(entry.end_time).toISOString() : null,
          duration_minutes: entry.duration_minutes,
          notes: entry.notes,
          org_id: entry.org_id
        });
        await saveItem(STORES.TIME_ENTRIES, { ...entry, synced: true });
        synced++;
      } catch (error) {
        console.error('Failed to sync time entry:', error);
        failed++;
      }
    }

    // Sync photos
    const unsyncedPhotos = await getUnsyncedPhotos();
    for (const photo of unsyncedPhotos) {
      try {
        const file = new File([photo.blob], `job-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Update job with photo URL
        const job = await base44.entities.Job.get(photo.job_id);
        const existingPhotos = job.completion_photos || [];
        await base44.entities.Job.update(photo.job_id, {
          completion_photos: [...existingPhotos, file_url]
        });
        
        await deleteItem(STORES.PHOTOS, photo.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync photo:', error);
        failed++;
      }
    }

  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
};

// Auto-sync when coming online
export const setupAutoSync = (onSyncComplete) => {
  const handleOnline = async () => {
    console.log('📡 Back online - starting sync...');
    const result = await syncPendingUpdates();
    console.log(`✅ Sync complete: ${result.synced} synced, ${result.failed} failed`);
    if (onSyncComplete) onSyncComplete(result);
  };

  window.addEventListener('online', handleOnline);

  // Also sync periodically when online
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncPendingUpdates();
    }
  }, 60000); // Every minute

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
};

// Get sync status
export const getSyncStatus = async () => {
  const pendingUpdates = await getPendingUpdates();
  const unsyncedTimeEntries = await getUnsyncedTimeEntries();
  const unsyncedPhotos = await getUnsyncedPhotos();

  return {
    pendingUpdates: pendingUpdates.length,
    unsyncedTimeEntries: unsyncedTimeEntries.length,
    unsyncedPhotos: unsyncedPhotos.length,
    total: pendingUpdates.length + unsyncedTimeEntries.length + unsyncedPhotos.length,
    isOnline: navigator.onLine
  };
};