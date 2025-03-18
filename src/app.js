import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config({
    path : "./.env"
})

const app = express()

app.use(express.json({ limit : "20kb" }))
app.use(cookieParser())
app.use(express.urlencoded({ extended : true, limit : "20kb" }))

const appPort = process.env.PORT || 8000
app.listen(appPort, () => {
    console.log(`App server is running on port : ${appPort}`)
})

//routes
import userRoutes from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";

app.use("/api/v1/user", userRoutes)
app.use("/api/v1/tasks", taskRoutes)

export { app };