import { NextFunction, Request, Response } from "express";
import store from "../store";
import { auditLogger, logger } from "../utils/logger";

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.id;
    const idempotencyKey = req.header("Idempotency-Key");


    if (!idempotencyKey) {
        logger.warn(`[req_${req.id}] [idempotency] Missing Idempotency-Key header`);

        auditLogger.info({
            event: "REQUEST_REJECTED",
            details: {
                requestId: req.id,
                reason: "Missing Idempotency-Key header",
                payload: req.body,
            },
        });

        return res.status(400).json({ error: "Missing required header: Idempotency-Key" });
    }

    const ttlSeconds = Number(process.env.TTL_SECONDS) || 86400;

    const record = await store.get(idempotencyKey);

    if (!record) {
        // User Story 1: New Request Handling
        await store.set(idempotencyKey, {
            transactionId: `txn_${crypto.randomUUID().split("-")[0]}`,
            status: "PENDING",
            requestBody: JSON.stringify(req.body),
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        });

        logger.info(`[req_${requestId}] [idempotency] New key registered. Lock acquired | Key: ${idempotencyKey}`);
        auditLogger.info({
            event: "RECEIVED",
            details: {
                requestId,
                idempotencyKey,
                payload: req.body,
            },
        });

        return next();
    }


    // Bonus User Story: Handling In-Flight Requests
    if (record.status === "PENDING") {
        logger.warn(`[req_${requestId}] [idempotency] In-flight request detected | Key: ${idempotencyKey}`);
        auditLogger.info({
            event: "WAITING",
            details: {
                requestId,
                idempotencyKey,
                reason: "Concurrent request with same idempotency key",
            },
        });

        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const updated = await store.get(idempotencyKey);
            if (updated?.status === "SUCCESS") {
                auditLogger.info({
                    event: "REPLAYED",
                    details: {
                        requestId,
                        idempotencyKey,
                        note: "Cached response returned after waiting for in-flight request",
                    },
                });
                return res.status(200).header("X-Cache-Hit", "true").json(JSON.parse(updated.responseBody!));
            }
        }

        return res.status(409).json({ error: "Request timed out waiting for duplicate to complete." });
    }

    if (record.status === "SUCCESS") {
        // User Story 3: Key Reuse with Different Body
        if (JSON.stringify(req.body) !== record.requestBody) {
            logger.warn(`[req_${requestId}] [idempotency] Payload mismatch for key: ${idempotencyKey}`);
            auditLogger.info({
                event: "DUPLICATE_REJECTED",
                details: {
                    requestId,
                    idempotencyKey,
                    reason: "Request body mismatch",
                    payload: req.body,
                },
            });
            return res.status(409).json({ error: "Idempotency key already used for a different request body." });
        }

        // User Story 2: Cache Hit / Replay
        logger.info(`[req_${requestId}] [idempotency] Cache hit. Replaying saved response | Key: ${idempotencyKey}`);
        auditLogger.info({
            event: "REPLAYED",
            details: {
                requestId,
                idempotencyKey,
                note: "Cached response returned for duplicate request",
            },
        });
        return res.status(200).header("X-Cache-Hit", "true").json(JSON.parse(record.responseBody!));
    }

    next();
}