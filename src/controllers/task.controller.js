import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create a new task
const createTask = asyncHandler(async (req, res) => {
    const { name, details, startDate, endDate, assignedTo } = req.body;
    
    if ([name, details, startDate, endDate].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Please provide all required task details");
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
        throw new ApiError(400, "End date cannot be before start date");
    }
    
    // If assignedTo is provided, verify that user exists
    if (assignedTo) {
        const userExists = await User.findById(assignedTo);
        if (!userExists) {
            throw new ApiError(404, "Assigned user not found");
        }
    }
    
    const task = await Task.create({
        name,
        details,
        startDate: start,
        endDate: end,
        assignedTo: assignedTo || null,
        assignedBy: req.user._id
    });
    
    if (!task) {
        throw new ApiError(500, "Something went wrong while creating the task");
    }
    
    return res.status(201)
        .json(new ApiResponse(201, task, "Task created successfully"));
});

// Get all tasks (with optional filters)
const getAllTasks = asyncHandler(async (req, res) => {
    const { status, startDate, endDate } = req.query;
    
    const filters = {};
    
    // Add filters if provided
    if (status) {
        filters.status = status;
    }
    
    if (startDate) {
        filters.startDate = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
        filters.endDate = { $lte: new Date(endDate) };
    }
    
    const tasks = await Task.find(filters)
        .populate("assignedTo", "username name email")
        .populate("assignedBy", "username name email");
    
    return res.status(200)
        .json(new ApiResponse(200, tasks, "Tasks retrieved successfully"));
});

// Get tasks assigned to me
const getMyTasks = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const tasks = await Task.find({ assignedTo: userId })
        .populate("assignedBy", "username name email");
    
    return res.status(200)
        .json(new ApiResponse(200, tasks, "Your tasks retrieved successfully"));
});

// Get tasks created by me
const getTasksCreatedByMe = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const tasks = await Task.find({ assignedBy: userId })
        .populate("assignedTo", "username name email");
    
    return res.status(200)
        .json(new ApiResponse(200, tasks, "Tasks created by you retrieved successfully"));
});

// Get a single task by ID
const getTaskById = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId)
        .populate("assignedTo", "username name email")
        .populate("assignedBy", "username name email");
    
    if (!task) {
        throw new ApiError(404, "Task not found");
    }
    
    return res.status(200)
        .json(new ApiResponse(200, task, "Task retrieved successfully"));
});

// Update a task
const updateTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { name, details, startDate, endDate, assignedTo, status } = req.body;
    
    const task = await Task.findById(taskId);
    
    if (!task) {
        throw new ApiError(404, "Task not found");
    }
    
    // Only the task creator can update most fields
    if (task.assignedBy.toString() !== req.user._id.toString() 
        && req.user._id.toString() !== task.assignedTo?.toString()) {
        throw new ApiError(403, "You don't have permission to update this task");
    }
    
    // If user is assignee but not creator, they can only update status
    if (task.assignedBy.toString() !== req.user._id.toString() 
        && req.user._id.toString() === task.assignedTo?.toString()) {
        
        if (name || details || startDate || endDate || assignedTo) {
            throw new ApiError(403, "You can only update the status of this task");
        }
        
        task.status = status || task.status;
        await task.save();
        
        return res.status(200)
            .json(new ApiResponse(200, task, "Task status updated successfully"));
    }
    
    // Update task fields if provided
    if (name) task.name = name;
    if (details) task.details = details;
    
    if (startDate) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : task.endDate;
        
        if (start > end) {
            throw new ApiError(400, "End date cannot be before start date");
        }
        
        task.startDate = start;
    }
    
    if (endDate) {
        const end = new Date(endDate);
        const start = startDate ? new Date(startDate) : task.startDate;
        
        if (start > end) {
            throw new ApiError(400, "End date cannot be before start date");
        }
        
        task.endDate = end;
    }
    
    if (assignedTo) {
        // Verify that user exists
        const userExists = await User.findById(assignedTo);
        if (!userExists) {
            throw new ApiError(404, "Assigned user not found");
        }
        
        task.assignedTo = assignedTo;
    }
    
    if (status) {
        task.status = status;
    }
    
    await task.save();
    
    return res.status(200)
        .json(new ApiResponse(200, task, "Task updated successfully"));
});

// Delete a task
const deleteTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId);
    
    if (!task) {
        throw new ApiError(404, "Task not found");
    }
    
    // Only the task creator can delete a task
    if (task.assignedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to delete this task");
    }
    
    await Task.findByIdAndDelete(taskId);
    
    return res.status(200)
        .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

// Assign a task to a user
const assignTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
        throw new ApiError(400, "Please provide a user ID to assign the task");
    }
    
    const task = await Task.findById(taskId);
    
    if (!task) {
        throw new ApiError(404, "Task not found");
    }
    
    // Only the task creator can assign the task
    if (task.assignedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to assign this task");
    }
    
    // Verify that user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(404, "User not found");
    }
    
    task.assignedTo = userId;
    await task.save();
    
    return res.status(200)
        .json(new ApiResponse(200, task, "Task assigned successfully"));
});

export {
    createTask,
    getAllTasks,
    getMyTasks,
    getTasksCreatedByMe,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask
};