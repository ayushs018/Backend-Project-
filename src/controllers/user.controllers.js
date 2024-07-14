import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {jwt} from 'jsonwebtoken'
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken 
        await user.save({validateBeforeSave : false})
        
        return {accessToken , refreshToken} ; 

    } catch (error) {
        throw new ApiError (500 , "Something went wrong while generating refresh and access tokens")
    }
}


const registerUser = asyncHandler(async(req , res) => {
    //
    const {username , email , fullName , password} = req.body
    console.log(email)

    if (
        [fullName , email , username , password].some((field) => 
        field?.trim() === '') 
    ) {
        throw new ApiError (400 , 'All field should be filled')
    }

    const existedUser = await User.findOne({
        $or: [{username} , {email}] // for searching if the user already exits in the db 
    })

    if (existedUser) {
        throw new ApiError (409 , 'User already exists')
    }
    // req.files look like this 
    // {
    //     "avatar": [
    //       {
    //         "fieldname": "avatar",
    //         "originalname": "avatar.png",
    //         "encoding": "7bit",
    //         "mimetype": "image/png",
    //         "destination": "uploads/",
    //         "filename": "1628001526345-avatar.png",
    //         "path": "uploads/1628001526345-avatar.png",
    //         "size": 12345
    //       }
    //     ],
    //     "coverImage": [
    //       {
    //         "fieldname": "coverImage",
    //         "originalname": "cover.jpg",
    //         "encoding": "7bit",
    //         "mimetype": "image/jpeg",
    //         "destination": "uploads/",
    //         "filename": "1628001526345-cover.jpg",
    //         "path": "uploads/1628001526345-cover.jpg",
    //         "size": 23456
    //       }
    //     ]
    //   }
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError (400 , 'Avatar is required')
    }

    let coverImageLocalPath ; 
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError (400 , 'Avatar is required')
    }

    const user = await User.create({
        fullName, 
        avatar : avatar.url , 
        coverImage : coverImage?.url || "" , 
        email , 
        password , 
        username : username.toLowerCase() , 
    })
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError (500 , 'Something went wrong while registering the user')
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User registered Succesfully")
    )
 })

const loginUser = asyncHandler (async(req , res) => {
    const [email , username , password] = req.body ; 

    if (!(username || email)) {
        throw new ApiError (400 , 'username or email is required')
    }

    const user = await User.findOne({
        $or: [{username} , {email}] 
    })

    if (!user) {
        throw new ApiError (400 , 'User does not exist') ;
    }

    const isPasswordValid = await user.isPasswordCorrect(password) // it is user not User(User is in db)
    if (!isPasswordValid) {
        throw new ApiError (401 , 'Invalid User credentials')
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id) ;

     const loggedInUser = await User.findById(user._id).
     select("-password -refreshToken") // we don't want the user to see password and refresh tokens 

    const options = {
        httpOnly : true , 
        secure : true ,
    }

    return res
    .status(200) 
    .cookie("accesToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse (
            200 , 
            {
                user : loginUser , accessToken,
                refreshToken , 
            }, 
            "User logged in Succesfully"
        )
    )
})


const logoutUser = asyncHandler(async(req , res) => {
    await User.findByIdAndUpdate(
        req.user._id ,
        {
            $set: {refreshToken : undefined}
        } , 
        {
            new : true , 
        }
    )

    const options = {
        httpOnly : true , 
        secure : true , 
    }

    return res.
    status(200).
    clearCookie("accesToken" , options).
    clearCookie("refreshToken" , options).
    json(new ApiResponse(200 , {} , "User loggedOut"))

})


const refreshAccessToken = asyncHandler(async(req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError (401 , 'unauthorised request')
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken , 
            process.env.REFRESH_TOKEN_SECRET 
        )
        const user = await User.findById(decodedToken._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError (401 , "Refresh Token is used")
        }
    
        const options = {
            httpOnly : true , 
            secure : true , 
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200) 
        .cookie("accessToken" , accessToken , options) 
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new ApiResponse (200 , 
                {accessToken , refreshToken : newRefreshToken } ,
                "Access token refreshed "
            )
        ) 
    } catch (error) {
        throw new ApiError (401 , error?.message || "Invalid refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req , res) => {
    const {oldPassword , newPassword} = req.body 
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400 , "Invalid old Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})
    return res.status(200)
    .json(new ApiResponse(200 , {} , "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req , res) => {
    return res
    .status(200) 
    .json(200 , req.user , "current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req , res) => {
    const {fullName , email} = req.body ;
    // const user = 
    if (!fullName ||  !email) {
        throw new ApiError (400 , "All fields are required") 
    }

    const user = User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set : {
                fullName : fullName , email : email , 
            }
        }  ,
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200 , user , "Account Details updated succesfully"))
})


const updateUserAvatar = asyncHandler (async(req , res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError (400 , "An error occured")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError (400 , "Error while uploading on avatar") 
    }
    const user = await User.findByIdAndUpdate(
        req.user?.id , 
        {
            $set : {
                avatar : avatar.url 
            }
        } ,
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar Image uploaded succesfully")
    )
})

const updateUserCoverImage = asyncHandler (async(req , res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError (400 , "An error occured")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError (400 , "Error while uploading on coverImage") 
    }
    const user = await User.findByIdAndUpdate(
        req.user?.id , 
        {
            $set : {
                coverImage : coverImage.url 
            }
        } ,
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Cover Image uploaded succesfully")
    )
})
//  alternate way 
// const registerUser = async (req , res) => {
//     try {
//         res.status(200).json({
//             message : 'ok'
//         })
//     } catch (error) {
//         res.status(500).json({
//             message : 'Internal server error'
//         })
//     }
// }


export {registerUser, updateUserCoverImage , updateUserAvatar , loginUser , logoutUser , refreshAccessToken , changeCurrentPassword , getCurrentUser  , updateAccountDetails}