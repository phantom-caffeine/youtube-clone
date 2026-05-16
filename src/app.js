import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin : process.env.CLIENT_URL,
    credentials : true
}));

app.use(express.json({ limit : "10mb" } ));
app.use(express.urlencoded({ limit : "10mb", extended : true }));

app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.router.js";
// routes declaration
app.use("/api/v1/users", userRouter);

// http://localhost:3000/api/v1/users/register this  is how the url would look like when we hit the register endpoint of user router
export default app;