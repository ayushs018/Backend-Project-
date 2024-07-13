import { app } from './app.js'
import connectDB from './db/index.js'
import dotenv from 'dotenv'
import { registerUser } from './controllers/user.controllers.js'
dotenv.config({
    path : './env'
})
/*import express from 'express'
const app = express()
;(async ()=> {
    try {
        await mongoose.connect(`${process.env.MONGODB_URO}/${DB_name}`)
        app.on("error" , (error) => {
            console.log("ERRR :" , error) ;
            throw error
        })
        app.listen(process.env.PORT , () => {
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("Error" , error)
        throw error
    }
})()
*/

connectDB()
.then(() => {
    app.on("error" , (error) => {
        console.log("ERRR before listening :" , error) ;
        throw error
    })

    app.listen(process.env.PORT || 5000 , () => {
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("Mongo db connection failed !!!" , error)
})

