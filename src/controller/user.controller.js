import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/User.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    
    // get user details from frontend
    const { fullName, email, username, password } = req.body;
    console.log(fullName, email, username, password);

    // validate the user details
    if(!fullName || !email || !username || !password) {
        res.status(400);
        throw new ApiError(400, "Please fill all the fields");
    }

    // check if user already exists
    const existedUser = await User.findOne({ 
        $or : [{email},{username}]
    })

    if(existedUser) {
        throw new ApiError(409, "User already exists with this email or username");
    }

    // check for images, avatar etc
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if(!avatarLocalPath || !coverImageLocalPath) {
        throw new ApiError(400, "Please upload avatar and cover image");
    }

    // upload to cloudinary and get the url
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatarResponse || !coverImageResponse) {
        throw new ApiError(500, "Error while uploading images to cloudinary");
    }

    // create user object and save to database
    const user = await User.create({
        fullName,
        email,
        username,
        password,
        avatar: avatarResponse.url,
        coverImage: coverImageResponse.url
    });

    // remove password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser) {
        throw new ApiError(500, "Error while creating user");
    }
    // check for user creation

    // return response
    return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));
})


export {registerUser};