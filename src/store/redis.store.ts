import { createClient } from "redis";
import { PaymentRecord } from "../types/payment-record.type";
import { IdempotencyStore } from "./store.interface";

export class RedisStore implements IdempotencyStore {
    private client: ReturnType<typeof createClient>;

    constructor() {
        this.client = createClient({ url: process.env.REDIS_URL! });
        this.client.on("connect", () => console.log("[Redis] Connecting..."));
        this.client.on("ready", () => console.log("[Redis] Connected"));
        this.client.on("error", (err: Error) => console.error("[Redis] Error:", err));
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async get(key: string): Promise<PaymentRecord | undefined> {
        const record = await this.client.get(key);
        return record ? JSON.parse(record) : undefined;
    }

    async set(key: string, record: PaymentRecord): Promise<void> {
        const ttl = Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000);
        await this.client.set(key, JSON.stringify(record), { EX: ttl });
    }

    async update(key: string, record: Partial<PaymentRecord>): Promise<void> {
        const existing = await this.get(key);
        if (!existing) return;
        await this.set(key, { ...existing, ...record });
    }
}