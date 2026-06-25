import winston from "winston";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `[${level.padEnd(15)}] ${timestamp} ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ],
});

const auditLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "logs/audit.log" }),
    ],
});

export { logger, auditLogger };
