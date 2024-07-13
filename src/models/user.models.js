import mongoose , {Schema} from 'mongoose'
// jwt for tokens 
// consits of two parts :
// headers : algorithms etc directly injected 
// payload : encrypted data
// secret : make unique tokens 
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt' // for hashing passwords 


const userSchema = new Schema(
    {
        username : {
            type: String , 
            required : true , 
            unique : true , 
            lowercase : true , 
            trim : true, 
            index : true , 
        } ,
        
        email : {
            type: String , 
            required : true , 
            unique : true , 
            lowercase : true , 
            trim : true, 
        } ,

        fullName : {
            type: String , 
            required : true ,  
            trim : true, 
            index : true , 
        } ,

        avatar : {
            type: String , 
            required : true , 
        } ,

        coverImage : {
            type : String ,
        } , 
        watchHistory : [
            {
                type : Schema.Types.ObjectId , 
                ref: 'Video'
            }
        ] , 

        password : {
            type : String , 
            required : [true , 'Password is required'] ,
        } , 
        refreshToken : {
            type : String , 
        }


    } , {timestamp : true})

// pre means before "save" exceute the following func
userSchema.pre("save" , async function (next) {
    if (! this.isModified('password')) return next() ;
    this.password = await bcrypt.hash(this.password , 10) ; 
    next()
})


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare (password , this.password)
}

userSchema.methods.generateAccessToken = function() {
    jwt.sign(
        {
            _id : this._id , 
            email : this.email , 
            username : this.username , 
            fullName : this.fullName ,

        } ,    
        process.env.ACCESS_TOKEN_SECRET , 
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY , 
        }
    )
}
userSchema.methods.generateRefreshToken = function() {
    jwt.sign(
        {
            _id : this._id , 
        } ,    
        process.env.REFRESH_TOKEN_SECRET , 
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY , 
        }
    )
}


export const User = mongoose.model("User" , userSchema)