import { MemoryStore } from "./memory.store";
import { RedisStore } from "./redis.store";
import { IdempotencyStore } from "./store.interface";

const store: IdempotencyStore = process.env.NODE_ENV === "development"
    ? new MemoryStore()
    : new RedisStore();

export default store;