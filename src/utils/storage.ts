/**
 * Storage Abstraction Layer
 * 
 * This module provides a unified interface for storing authentication data.
 * Currently uses sessionStorage for better security (data cleared on tab close).
 * 
 * To switch to localStorage (persistent across browser sessions), 
 * simply change STORAGE_TYPE to 'local'.
 */

export type StorageType = 'session' | 'local';

/**
 * Configure storage type here
 * - 'session': Uses sessionStorage (default, cleared when tab/browser closes)
 * - 'local': Uses localStorage (persists until explicitly cleared)
 */
const STORAGE_TYPE: StorageType = 'session';

/**
 * Get the appropriate storage object based on configuration
 */
const getStorage = (): Storage => {
    return STORAGE_TYPE === 'session' ? sessionStorage : localStorage;
};

/**
 * Store a value in the configured storage
 */
export const storageSet = (key: string, value: string): void => {
    try {
        getStorage().setItem(key, value);
    } catch (error) {
        console.error(`Error setting storage key "${key}":`, error);
    }
};

/**
 * Retrieve a value from the configured storage
 */
export const storageGet = (key: string): string | null => {
    try {
        return getStorage().getItem(key);
    } catch (error) {
        console.error(`Error getting storage key "${key}":`, error);
        return null;
    }
};

/**
 * Remove a value from the configured storage
 */
export const storageRemove = (key: string): void => {
    try {
        getStorage().removeItem(key);
    } catch (error) {
        console.error(`Error removing storage key "${key}":`, error);
    }
};

/**
 * Clear all items from the configured storage
 */
export const storageClear = (): void => {
    try {
        getStorage().clear();
    } catch (error) {
        console.error(`Error clearing storage:`, error);
    }
};

/**
 * Check if storage is available
 * Useful for graceful degradation in private browsing modes
 */
export const isStorageAvailable = (): boolean => {
    try {
        const storage = getStorage();
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Get current storage type for debugging/display purposes
 */
export const getStorageType = (): StorageType => STORAGE_TYPE;
