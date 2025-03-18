import mongoose, { Schema } from "mongoose";


const otpSchema = new Schema({

    otp : {
        type : String,
        required : true
    },

    email : {
        type : String,
        required : true,
        trim : true
    },

    createdAt : {
        type : Date,
        expires : "5m",
        Default : Date.now
    }
},{
    timestamps : true
})


export const Otp = mongoose.model("Otp", otpSchema)