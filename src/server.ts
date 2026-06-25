import "./env";
import express, { Request, Response } from "express";
import { processPayment } from "./controllers/payment.controller";
import { idempotencyMiddleware } from "./middleware/idempotency.middleware";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware";
import store from "./store";

const app = express();

app.use(express.json());
app.use(requestLoggerMiddleware);

app.post("/process-payment", idempotencyMiddleware, processPayment);

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime().toFixed() + " seconds",
    });
});

const PORT = process.env.PORT || 3000;

async function start() {
    await store.connect();

    app.listen(PORT, () => {
        console.log(`+ Server is running on port ${PORT}\n`);
    });
}

start();