
import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./config/db.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import partRoutes from "./routes/partRoutes.js";
import AddPartsRoutes from "./routes/AddPartsRoutes.js";

const app = express();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded product images
app.use(
  "/uploads",
  express.static(path.join(currentDirectory, "uploads"))
);

// Vehicle API routes
app.use("/api/vehicles", vehicleRoutes);

// Existing part search and catalogue routes
app.use("/api/parts", partRoutes);

// New product registration routes
app.use("/api/parts", AddPartsRoutes);

// Basic server test
app.get("/", (req, res) => {
  res.json({
    message: "Automotive Spare Parts POS API is running!",
  });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time"
    );

    res.json({
      message: "Successfully connected to PostgreSQL!",
      database: process.env.DB_NAME,
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database test failed:", error.message);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("Connected to PostgreSQL database successfully!");

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      "Could not connect to PostgreSQL:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
