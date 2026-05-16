import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../models/User.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


const generateAcessTokeAndRefreshToken = async (userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        
        await user.save({validateBeforeSave : false});
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Error while generating access token and refresh token");
    }
}

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
});

const loginUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, email, password } = req.body;
    // validate the user details
    if((!email && !username) || !password) {
        res.status(400);
        throw new ApiError(400, "Please fill all the fields");
    }
    const user = await User.findOne(
        {
            $or : [
                {email},
                {username}
            ]
        }
    )

    if(!user) {
        throw new ApiError(404, "User not found with this email or username");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAcessTokeAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure : true,
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, "User logged in successfully", {user : loggedInUser, accessToken}));
});

const logoutUser = asyncHandler(async (req, res) => {
        const user = await User.findByIdAndUpdate(req.user._id, {
            $set: {
                refreshToken: undefined
            }
        }, {
            new: true
        });

        const options = {
            httpOnly : true,
            secure : true,
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
        if(!incomingRefreshToken) {
            throw new ApiError(400, "Refresh token is required");
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
        if(!user || user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized, invalid refresh token");
        }
    
    
        const options = {
            httpOnly : true,
            secure : true,
        }
    
        const {accessToken, refreshToken : newRefreshToken} = await generateAcessTokeAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, 
            "Access token refreshed successfully", 
            {accessToken,newRefreshToken}));
    } catch (error) {
    console.log(error);
    throw new ApiError(401, error?.message || "Error while refreshing access token");
}
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if(!currentPassword || !newPassword) {
        throw new ApiError(400, "Please fill all the fields");
    }

    const user = await User.findById(req.user._id);

    if(!user) {
        throw new ApiError(404, "User not found");
    }
    const isPasswordValid = await user.isPasswordCorrect(currentPassword);

    if(!isPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, "Password changed successfully"));
});

const getCurrentUserDetails = asyncHandler(async (req, res) => {
        return res
        .status(200)
        .json(new ApiResponse(200, "User details fetched successfully", req.user));
});

const updateCurrentUserDetails = asyncHandler(async (req, res) => {
        const { fullName, email } = req.body;
        if(!fullName && !email) {
            throw new ApiError(400, "Please fill at least one field to update");
        }

        const user = await User.findByIdAndUpdate(req.user?._id, {
            $set : {
                fullName,
                email : email
            }
        }, {
            new : true
        }).select("-password -refreshToken");

        if(!user) {
            throw new ApiError(404, "User not found");
        }

        return res
        .status(200)
        .json(new ApiResponse(200, "User details updated successfully", user));
});

const avatarUpdate= asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Please upload avatar image");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) {
        throw new ApiError(500, "Error while uploading avatar to cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set : {
            avatar : avatar.url
        }
    }, {
        new : true
    }).select("-password -refreshToken");

    if(!user) {
        throw new ApiError(404, "User not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});


export {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUserDetails,
    updateCurrentUserDetails,
    avatarUpdate
}