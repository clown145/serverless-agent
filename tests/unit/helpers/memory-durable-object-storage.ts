type MemoryTransaction = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  list<T = unknown>(options?: DurableObjectListOptions): Promise<Map<string, T>>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
};

export function createMemoryDurableObjectStorage(): DurableObjectStorage {
  const values = new Map<string, unknown>();
  let alarm: number | null = null;

  const storage = {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      return values.get(key) as T | undefined;
    },

    async list<T = unknown>(options: DurableObjectListOptions = {}): Promise<Map<string, T>> {
      const entries = [...values.entries()]
        .filter(([key]) => !options.prefix || key.startsWith(options.prefix))
        .filter(([key]) => !options.start || key >= options.start)
        .filter(([key]) => !options.end || key < options.end)
        .sort(([left], [right]) => left.localeCompare(right));
      const limited = typeof options.limit === "number" ? entries.slice(0, options.limit) : entries;
      return new Map(limited as Array<[string, T]>);
    },

    async put<T>(key: string, value: T): Promise<void> {
      values.set(key, value);
    },

    async delete(key: string): Promise<boolean> {
      return values.delete(key);
    },

    async transaction<T>(closure: (txn: DurableObjectTransaction) => Promise<T>): Promise<T> {
      const snapshot = new Map(values);
      const txn: MemoryTransaction = {
        get: storage.get,
        list: storage.list,
        put: storage.put,
        delete: storage.delete
      };

      try {
        return await closure(txn as DurableObjectTransaction);
      } catch (error) {
        values.clear();
        for (const [key, value] of snapshot) {
          values.set(key, value);
        }
        throw error;
      }
    },

    async getAlarm(): Promise<number | null> {
      return alarm;
    },

    async setAlarm(scheduledTime: number | Date): Promise<void> {
      alarm = scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime;
    },

    async deleteAlarm(): Promise<void> {
      alarm = null;
    }
  };

  return storage as DurableObjectStorage;
}
