import { NextFunction, Request, Response } from "express";

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.header("Idempotency-Key");

    if (!idempotencyKey) {
        return res.status(400).json({ error: "Missing required header: Idempotency-Key" });
    }

    next();
}