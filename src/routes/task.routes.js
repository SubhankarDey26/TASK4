import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    createTask,
    getAllTasks,
    getMyTasks,
    getTasksCreatedByMe,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask
} from "../controllers/task.controllers.js";

const router = Router();

// All routes are protected with JWT authentication
router.use(verifyJwt);

// Create and get all tasks
router.route("/")
    .post(createTask)
    .get(getAllTasks);

// Get tasks assigned to the authenticated user
router.route("/my-tasks")
    .get(getMyTasks);

// Get tasks created by the authenticated user
router.route("/created-by-me")
    .get(getTasksCreatedByMe);

// Get, update, and delete a specific task
router.route("/:taskId")
    .get(getTaskById)
    .patch(updateTask)
    .delete(deleteTask);

// Assign a task to a user
router.route("/:taskId/assign")
    .post(assignTask);

export default router;