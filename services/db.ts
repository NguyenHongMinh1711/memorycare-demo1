import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MemoryCareDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyValueStore';

interface StoredObject {
  key: string;
  value: any;
}

let dbPromise: Promise<IDBPDatabase>;

const initDB = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

export const get = async <T>(key: string): Promise<T | undefined> => {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  return result ? result.value : undefined;
};

export const set = async (key: string, value: any): Promise<IDBValidKey> => {
  const db = await initDB();
  return db.put(STORE_NAME, { key, value });
};

export const del = async (key: string): Promise<void> => {
  const db = await initDB();
  return db.delete(STORE_NAME, key);
};

export const clear = async (): Promise<void> => {
  const db = await initDB();
  return db.clear(STORE_NAME);
};

export const getAllDataForExport = async (): Promise<Record<string, any>> => {
    const db = await initDB();
    const allItems = await db.getAll(STORE_NAME);
    const exportData: Record<string, any> = {};
    allItems.forEach(item => {
        exportData[item.key] = item.value;
    });
    return exportData;
};

export const importData = async (data: Record<string, any>, mode: 'merge' | 'overwrite'): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    if (mode === 'overwrite') {
        await store.clear();
    }
    
    const importPromises: Promise<any>[] = [];

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const promise = (async () => {
                const newValue = data[key];
                if (mode === 'merge') {
                    const existingRecord = await store.get(key);
                    const existingValue = existingRecord?.value;

                    if (Array.isArray(existingValue) && Array.isArray(newValue)) {
                        // Merge arrays of objects that have an 'id' property
                        if (newValue.length > 0 && typeof newValue[0] === 'object' && newValue[0] !== null && 'id' in newValue[0]) {
                            const mergedMap = new Map();
                            existingValue.forEach(item => item?.id && mergedMap.set(item.id, item));
                            newValue.forEach(item => item?.id && mergedMap.set(item.id, item));
                            await store.put({ key, value: Array.from(mergedMap.values()) });
                        } 
                        // Merge simple arrays (like emails) using a Set to handle duplicates
                        else {
                            const mergedSet = new Set([...existingValue, ...newValue]);
                            await store.put({ key, value: Array.from(mergedSet) });
                        }
                    } else {
                        // For non-array values or mismatched types, the imported value takes precedence.
                        await store.put({ key, value: newValue });
                    }
                } else { // Overwrite mode
                    await store.put({ key, value: newValue });
                }
            })();
            importPromises.push(promise);
        }
    }

    await Promise.all(importPromises);
    await tx.done;
};
