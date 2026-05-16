import { Router } from "express";
import { registerUser } from "../controller/user.controller.js";
import upload from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { loginUser, logoutUser } from "../controller/user.controller.js";
import { refreshAccessToken } from "../controller/user.controller.js";
import { changeCurrentPassword } from "../controller/user.controller.js";
import { getCurrentUserDetails } from "../controller/user.controller.js";
import { updateCurrentUserDetails } from "../controller/user.controller.js";
import { avatarUpdate } from "../controller/user.controller.js";
const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-password").post(verifyJWT, changeCurrentPassword);
export default router;