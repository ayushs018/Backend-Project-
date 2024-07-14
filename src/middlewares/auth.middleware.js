import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from 'jsonwebtoken'
import { User } from "../models/user.models";
export const verifyJWT = asyncHandler(async(req , res , next) => {
    try {
        const token = req.cookies?.accesToken || req.header('Authorization')?.replace('Bearer ' , "")
    
        if (!token) {
            throw new ApiError(401 , "Unauthorized user")
        }
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )
        if (!user) {
            throw new ApiError(401 , 'Invalid Access Token')
        }
        req.user() = user ; 
        next()
    } catch (error) {
        throw new ApiError(401 ,error?.message || "Invalid access token")
    }
})
// headers sent with both req , response. It is the part of the Http protocol 
// Content-Type: Indicates the media type of the resource (e.g., application/json for JSON data).
// Authorization: Contains credentials for authenticating the client (e.g., Bearer <token> for JWT).
// User-Agent: Identifies the client software making the request (e.g., browser type and version).
// Accessing Headers in Express:

// req.header('Header-Name'): Retrieves the value of a specific header.
// req.headers: An object containing all headers as key-value pairs.