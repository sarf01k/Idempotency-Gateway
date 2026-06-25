import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.id = crypto.randomUUID().split("-")[0]!;

    logger.info(`[req_${req.id}] INCOMING "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}"`);

    res.on("finish", () => {
        const status = res.statusCode;

        const finalMessage = `[req_${req.id}] RESPONSE "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${status} ${res.statusMessage}`;

        if (status >= 400) {
            logger.error(finalMessage);
        } else {
            logger.info(finalMessage);
        }
    });

    next();
}