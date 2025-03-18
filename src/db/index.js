import mongoose from "mongoose";


const db_connect = async () => {
    
    try {
        const db_connection = await mongoose.connect(process.env.MONGODB_URL)
        console.log(`App is connnected with database connection host : ${db_connection.connection.host}`);
    } catch (error) {
        console.log("Error while connecting app database", error);
    }   
}


export { db_connect }