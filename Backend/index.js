
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// ROUTES
// ===============================

app.use("/api", routes);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.send("John Naqvi Mobile Stock Backend Live!");
});

// ===============================
// SERVER CONFIG
// ===============================

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Check MongoDB URI
if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is missing in .env file");
  process.exit(1);
}

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(
      "MongoDB Connection Failed:",
      err.message
    );
    process.exit(1);
  });

