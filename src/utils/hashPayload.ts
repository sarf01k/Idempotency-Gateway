import crypto from "crypto";

export function hashPayload(payload: any): string {
    return crypto.createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
}