import { Request, Response } from "express";
import { PaymentRequestSchema } from "../schemas/payment-request.schema";
import store from "../store";
import { logger } from "../utils/logger";

export const processPayment = async (req: Request, res: Response) => {
    try {
        const requesBodyParse = PaymentRequestSchema.safeParse(req.body);

        // Validate the request body
        if (!requesBodyParse.success) {
            return res.status(400).json({ error: requesBodyParse.error.flatten().fieldErrors });
        }

        // Simulate payment processing logic
        const { amount, currency } = requesBodyParse.data;

        const idempotencyKey = req.header("Idempotency-Key") as string;

        await new Promise(_ => setTimeout(_, 2000));

        const responseBody = { message: `Charged ${amount} ${currency}` };

        await store.update(idempotencyKey, {
            status: "SUCCESS",
            responseBody: JSON.stringify(responseBody),
        });

        res.status(200).json(responseBody);
    } catch (error) {
        logger.error(`[req_${req.id}] [payment] Error processing payment: ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
}