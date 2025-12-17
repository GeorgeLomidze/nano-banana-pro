
import { HistoryItem } from '../types';

const DB_NAME = 'BananaProDB';
const STORE_NAME = 'history';
const DB_VERSION = 1;
const MAX_HISTORY_ITEMS = 100;

export class StorageService {
  private static db: IDBDatabase | null = null;

  private static async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db!);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  static async getAllHistory(): Promise<HistoryItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveHistoryItem(item: HistoryItem): Promise<void> {
    const db = await this.getDB();
    
    // First, save the new item
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Then, enforce the limit of MAX_HISTORY_ITEMS
    await this.enforceHistoryLimit();
  }

  private static async enforceHistoryLimit(): Promise<void> {
    const allItems = await this.getAllHistory();
    
    if (allItems.length <= MAX_HISTORY_ITEMS) return;

    // Sort by timestamp descending (newest first)
    allItems.sort((a, b) => b.timestamp - a.timestamp);

    // Get items to delete (everything after the first 100)
    const itemsToDelete = allItems.slice(MAX_HISTORY_ITEMS);

    // Delete old items
    for (const item of itemsToDelete) {
      await this.deleteHistoryItem(item.id);
    }
    
    console.log(`Cleaned up ${itemsToDelete.length} old history items. Keeping ${MAX_HISTORY_ITEMS} most recent.`);
  }

  static async deleteHistoryItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async clearAllHistory(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
