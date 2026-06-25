export interface PaymentRecord {
    transactionId: string,
    status: "SUCCESS" | "PENDING",
    requestBody: string;
    responseBody?: string;
    timestamp: string,
    expiresAt: string
}