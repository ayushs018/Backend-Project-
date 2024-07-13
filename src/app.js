import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
const app = express() 


// default settings to be done 
app.use(cors({
    origin : process.env.CORS_ORIGIN,  // konse website se data accesible hona chaiye yeh mention kar rahe hai 
    credentials : true ,
}))

app.use(express.json({limit : '16kb'})) // limit bata rahe ki ek baar mein kitna data aa sakta hai json type me
app.use(express.urlencoded({extended : true , limit : '16kb'}))
app.use(express.static("public")) // storing static files 
app.use(cookieParser())



// routes 
import userRouter from './routes/user.routes.js'
// routes declaration 
app.use('/api/v1/users' , userRouter)

export {app}