const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const dotenv = require("dotenv").config();
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

app.use("/api/drive", driveRoutes);
app.use("/api/auth", authRoutes);

// port
const port = 3000 || process.env.PORT;
app.listen(port, () => console.log(`App available`));
