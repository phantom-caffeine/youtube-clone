import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../models/User.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            return res.status(401).json({message : "Unauthorized, no token provided"});
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        if(!user){
            return res.status(401).json({message : "Unauthorized, user not found"});
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, "Unauthorized, invalid token");
    }
})