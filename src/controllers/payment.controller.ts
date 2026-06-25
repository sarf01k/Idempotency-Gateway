import { Request, Response } from "express";
import { PaymentRequestSchema } from "../types/payment-request";

export const processPayment = async (req: Request, res: Response) => {
    try {
        const requesBodyParse = PaymentRequestSchema.safeParse(req.body);

        // Validate the request body
        if (!requesBodyParse.success) {
            return res.status(400).json({ error: requesBodyParse.error.flatten().fieldErrors });
        }

        // Simulate payment processing logic
        const { amount, currency } = requesBodyParse.data;

        await new Promise(_ => setTimeout(_, 2000));

        const paymentResponse = {
            transactionId: `txn_${crypto.randomUUID().split("-")[0]}`,
            status: "success",
            amount,
            currency,
            timestamp: new Date().toISOString(),
        };

        res.status(200).json({
            message: `Charge ${amount} ${currency}`,
        });
    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}