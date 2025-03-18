import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { forgotPassword,
         loginUser,
         logoutUser,
         registerUser, 
         resetPassword, 
         updateAccessToken } from "../controllers/user.controllers.js";


const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh-access-token").post(updateAccessToken)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password/:token").post(resetPassword)


export default router;