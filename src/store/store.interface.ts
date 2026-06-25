import { PaymentRecord } from "../types/payment-record.type";

export interface IdempotencyStore {
    connect(): Promise<void>;
    get(key: string): Promise<PaymentRecord | undefined>;
    set(key: string, record: PaymentRecord): Promise<void>;
    update(key: string, record: Partial<PaymentRecord>): Promise<void>;
}