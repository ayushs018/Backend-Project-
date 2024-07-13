import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async(req , res) => {
    //
    const {username , email , fullname , password} = req.body
    console.log(email)

    if (
        [fullname , email , username , password].some((field) => 
        field?.trim() === '') 
    ) {
        throw new ApiError (400 , 'All field should be filled')
    }

    const existedUser = User.findOne({
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
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError (400 , 'Avatar is required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError (400 , 'Avatar is required')
    }

    const user = await User.create({
        fullname, 
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


export {registerUser}