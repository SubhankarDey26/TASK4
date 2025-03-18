import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({

    username : {
        type : String,
        required : true,
        unique : true,
        trim : true
    },

    name : {
        type : String,
        required : true,
        trim : true
    },

    password : {
        type : String,
        required : true
    },

    email : {
        type : String,
        required : true
    },

    refreshToken : {
        type : String
    }
},
{
    timestamps : true
})


userSchema.pre("save", async function (next){

    if(!this.isModified("password")){
        return next()
    }

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.generateAccessToken = function (){
    
    const payload = {
        _id : this._id,
        username : this.username,
        email : this.email,
    }
    return jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : "18000000ms"
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
   
    const payload = {
        _id : this._id,
    }
    return jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : "10d"
        }
    )
}


export const User = mongoose.model("User", userSchema)


