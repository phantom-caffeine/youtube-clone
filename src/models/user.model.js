import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true // Indexing for faster queries
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true // Indexing for faster queries
    },
    avatar : {
        type : String,
        required : true,

    },
    coverImage : {
        type : String,
        required : true,
    },
    watchHistory : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true, "Password is required"],
    },
    refreshToken : {
        type : String,
    },
    
}, {
    timestamps : true
});


userSchema.pre("save", async function(){
    if(!this.isModified("password")){
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
})// dont use arrow function here because we need access to "this"

userSchema.methods.isPasswordCorrect = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
    {
        id : this._id, 
        username : this.username,
        email : this.email, // this is database waali cheez, not the one in the token payload, we will use this to verify the token and get user details from it
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRES_IN
        }
    );
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {id : this._id},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn : process.env.REFRESH_TOKEN_EXPIRES_IN}
    );
}

export const User = mongoose.model("User", userSchema);