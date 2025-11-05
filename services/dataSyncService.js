/**
 * Data Sync Service
 * Handles data synchronization and conflict resolution
 */

import ChecklistData from '../models/ChecklistData.js';
import { areChangesCompatible, mergeDataIntelligently } from '../utils/helpers.js';

/**
 * Sync user checklist data with intelligent conflict resolution
 */
export const syncChecklistData = async (userId, clientData, clientVersion, clientLastUpdated) => {
  try {
    // Get current data from database
    const currentData = await ChecklistData.findOne({ userId });

    if (!currentData) {
      // Create new record if it doesn't exist
      return await ChecklistData.create({
        userId,
        data: clientData,
        version: 1,
        lastUpdated: new Date(),
      });
    }

    // Intelligent conflict resolution
    if (clientVersion && clientLastUpdated) {
      const clientLastUpdatedDate = new Date(clientLastUpdated);
      const serverLastUpdatedDate = new Date(currentData.lastUpdated);

      // Only treat as conflict if server data is significantly newer (more than 2 seconds)
      const timeDiff = serverLastUpdatedDate.getTime() - clientLastUpdatedDate.getTime();

      if (timeDiff > 2000 && clientVersion < currentData.version) {
        // 2-second grace period

        // Auto-merge strategy: Check if changes are compatible
        if (areChangesCompatible(currentData.data, clientData)) {
          // Merge changes intelligently
          const mergedData = mergeDataIntelligently(currentData.data, clientData);
          currentData.data = mergedData;
        } else {
          // Return conflict for incompatible changes
          throw {
            name: 'ConflictError',
            message: 'CONFLICT: Significant changes detected',
            serverData: currentData.data,
            serverVersion: currentData.version,
            serverLastUpdated: currentData.lastUpdated,
            requiresUserResolution: true,
          };
        }
      } else if (timeDiff > 0) {
        // Small time difference, prefer client data (likely rapid sequential updates)
        currentData.data = clientData;
      } else {
        // Client has newer or equal data, accept it
        currentData.data = clientData;
      }
    } else {
      // No version info, accept client data
      currentData.data = clientData;
    }

    // Update version and timestamp
    currentData.version = (currentData.version || 1) + 1;
    currentData.lastUpdated = new Date();

    await currentData.save();
    return currentData;
  } catch (error) {
    console.error('Error syncing checklist data:', error);
    throw error;
  }
};

/**
 * Force sync - get latest data from server without conflict checks
 */
export const forceSyncChecklistData = async (userId) => {
  try {
    const data = await ChecklistData.findOne({ userId });

    if (!data) {
      throw new Error('Data not found');
    }

    return data;
  } catch (error) {
    console.error('Error in force sync:', error);
    throw error;
  }
};