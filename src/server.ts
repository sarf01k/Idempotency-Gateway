import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime().toFixed() + " seconds",
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`+ Server is running on port ${PORT}\n`);
});