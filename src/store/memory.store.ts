import { PaymentRecord } from "../types/payment-record.type";
import { IdempotencyStore } from "./store.interface";

export class MemoryStore implements IdempotencyStore {
    private store: Map<string, PaymentRecord> = new Map();

    async connect(): Promise<void> {
        console.log("[Store] Using in-memory store");
    }

    async get(key: string): Promise<PaymentRecord | undefined> {
        const record = this.store.get(key);
        if (!record) return undefined;
        if (new Date(record.expiresAt) < new Date()) {
            this.store.delete(key);
            return undefined;
        }
        return record;
    }

    async set(key: string, record: PaymentRecord): Promise<void> {
        this.store.set(key, record);
    }

    async update(key: string, record: Partial<PaymentRecord>): Promise<void> {
        const existing = await this.get(key);
        if (!existing) return;
        this.store.set(key, { ...existing, ...record });
    }
}