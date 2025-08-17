const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Routes
const driveRoutes = require("./routes/drive");
const authRoutes = require("./routes/auth");

// Middleware
const { limiter } = require("./middleware/limit");

app.use(express.json());
app.use(cors());

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("client"));

app.use("/api/drive", limiter, driveRoutes);
app.use("/api/auth", limiter, authRoutes);

app.listen(3000, () => console.log("App available on http://localhost:3000"));
