import connectDB from './db/index.js'
import dotenv from 'dotenv'
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