import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Otp } from "../models/otp.model.js";
import otpgenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    
    try {
        
        const user = await User.findById(userId);
        if(!user){
            throw new ApiError(401, "No user found with this userId")
        }
    
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        if(!accessToken || !refreshToken){
            throw new ApiError(400, "Something went wrong while generation of the user")
        }
    
        user.refreshToken = refreshToken
        await user.save(
            {
                validateBeforeSave : false,
            }
        )
    
        return {accessToken, refreshToken};    
    } catch (error) {
            console.log("Process error while generating access and refresh tokens, Please try again!", error)
    }
}

//testing = Done(Success)
const registerUser = asyncHandler( async (req, res) => {
    
    const { username, name, email, password, confirmPassword , otp} = req.body

    if(!otp){
        //console.log(username)
        if([username, name, email, password, confirmPassword].some((fields) => { return fields.trim() === "" })){
            throw new ApiError(400, "Please provide all the details")
        }

    //regex include check of @, dot
    const emailRegex = /^(?!\.)[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if(emailRegex.test(email)===false){
        throw new ApiError(400, "Please provide a valid email")
    }
    //include one uppercase, special character and a number
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if(passwordRegex.test(password)===false){
        throw new ApiError(400, "Please provide a password with atleast a Uppercase, a special character and a number")
    }
    
    if(password !== confirmPassword){
        throw new ApiError(400, "Password and confirmPassword field does'nt match.")
    }

    const existedUser = await User.findOne({
        $or : [{email}, {username}]
    })
    if(existedUser){
        throw new ApiError(409, "User already exist with these details")
    }

    const otp = otpgenerator.generate(6, {
                  digits : true, 
                  upperCaseAlphabets : false,
                  lowerCaseAlphabets : false,
                  specialChars : false
    })

    const OTP = await Otp.create({
        otp,
        email
    })
    if(!OTP){
        throw new ApiError(500, "Something went wrong while creating otp entry")
    }

    const transporter = nodemailer.createTransport({
        service : "gmail",
        auth : {
            user : "madhavv8528@gmail.com",
            pass : process.env.GMAIL_PASS
        }
    })

    const otpEmail = await transporter.sendMail({
        from : "madhavv8528@gmail.com",
        to : email,
        subject : "Otp verification for Task Mangement App",
        text : `Your otp for registering on task management app is ${otp}`
    })
    if(!email){
        throw new ApiError(503, "nodemailer service unable to send otp mail.")
    }

    return res.status(200)
    .json( new ApiResponse(200, email.body, "Otp has successfully sent to email, kindly validate") )
    }

    const verifyOtp = await Otp.findOne( { 
        $or : [{otp}, {email}]
    })
    if(!verifyOtp){
        throw new ApiError(402, "Otp is not valid, please register again.")
    }

    const user = await User.create({
        username,
        name,
        email,
        password,
    })
    if(!user){
        throw new ApiError(500, "Something went wrong while creating user entry in db.")
    }

    const createdUser = await User.findById(user._id).select("-password")

    return res.status(200)
    .json( new ApiResponse(200, createdUser, "User has successfullly registered.") )
})

//testing = Done(Success)
const loginUser = asyncHandler( async (req, res) => {
    
    const { email, password } = req.body

    if([password, email]
        .some((field) => 
              { return field.trim()=== "" }))
   {
        throw new ApiError(400, "Please provide email and password to login")
   }

   const emailRegex = /^(?!\.)[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
   if(emailRegex.test(email)===false){
        throw new ApiError(400, "Please provide a valid email")
   }

   const user = await User.findOne({email})
   if(!user){
        throw new ApiError(400, "No user find with this email")
   }
   
   const validPassword = await bcrypt.compare(password, user.password)
   if(validPassword === false){
        throw new ApiError(401, "Please enter a valid password")
   }

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
   const options = {
        secure : true,
        httpOnly : true
   }

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   if(!loggedInUser){
        throw new ApiError(404, "Something went wrong while logging user.")
   }

   return res.status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json( new ApiResponse(200, loggedInUser, "User logged in successfully"))
})

//testing = Done(Success)
const logoutUser = asyncHandler( async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
           $unset : {
            refreshToken : 1
        }
    },
    {
        new : true
    })

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .clearCookie("AccessToken", options)
    .clearCookie("RefreshToken", options)
    .json( new ApiResponse(200, "User logged out successfully"))
})

//testing = Done(Success)
const updateAccessToken = asyncHandler( async (req, res) => {
    
    const token = req.cookies?.refreshToken
    if(!token){
        throw new ApiError(400, "Refresh token not found for user")
    }

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
    if(!decodedToken){
        throw new ApiError(501, "Something went wrong while decoding token")
    }

    const user = await User.findById(decodedToken?._id)
    if(!user){
        throw new ApiError(401, "No user found with these details")
    }

    if( token !== user.refreshToken ){
        throw new ApiError(402, "User not authorize, kindly login to continue")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    const options = {
        secure : true,
        httpOnly : true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(200, {accessToken, refreshToken}, "New access token has been generated."))
})

//testing = Done(Success)
const forgotPassword = asyncHandler( async (req, res) => {
    
    const { email } = req.body
    if(!email){
        throw new ApiError(400, "Please provide the email to recover account")
    }

    const user = await User.find({email})
    if(!user){
        throw new ApiError(401, "No account found with this email")
    }

    const token = jwt.sign({email}, process.env.JWT_TOKEN_SECRET, {expiresIn : "15m"})
    if(!token){
        throw new ApiError(500, "Something wrong while generation of token")
    }

    const transporter = nodemailer.createTransport({
        service : "gmail",
        auth : {
            user : "madhavv8528@gmail.com",
            pass : process.env.GMAIL_PASS
        }})

    const link = `https://localhost:7240/api/v1/user/reset-password/${token}`
    const recoveryEmail = transporter.sendMail({
        from : "madhavv8528@gmail.com",
        to : email,
        subject : "Account recovery for task management",
        text : `Click on the link to recover your password ${link}.`
    })
    if(!recoveryEmail){
        throw new ApiError(500, "Something went wrong while sending recovery email.")
    }

    return res.status(200)
    .json( new ApiResponse(200, recoveryEmail.body, "Recovery email sent successfully."))
})

//testing = Done(Success)
const resetPassword = asyncHandler( async (req, res) => {
    
    const { token } = req.params
    const { password, confirmPassword } = req.body

    if(!password || !confirmPassword){
        throw new ApiError(400, "Please provide the password to recover account.")
    }

    const decodedToken = jwt.decode(token, process.env.JWT_TOKEN_SECRET)
    if(!decodedToken){
        throw new ApiError(500, "Something went wrong while decoding token.")
    }
    const userEmail = decodedToken.email
    //console.log(userEmail);
    
    const user = await User.findOne({email : userEmail})
    if(!user){
        throw new ApiError(401, "No account found with the following email.")
    }
    //console.log(user);
    
    if(password !== confirmPassword){
        throw new ApiError(400, "Password does'nt match with confirm password, kindly check.")
    }

    user.password = password
    await user.save({ validateBeforeSave : false })

    return res.status(200)
    .json( new ApiResponse(200, null, "Account password updated successfully.") )
})


export { registerUser,
         loginUser,
         logoutUser,
         updateAccessToken,
         forgotPassword,
         resetPassword
}