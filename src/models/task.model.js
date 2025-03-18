import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    details: {
        type: String,
        required: true
    },
    
    startDate: {
        type: Date,
        required: true
    },
    
    endDate: {
        type: Date,
        required: true
    },
    
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    status: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending"
    }
}, {
    timestamps: true
});

export const Task = mongoose.model("Task", taskSchema);