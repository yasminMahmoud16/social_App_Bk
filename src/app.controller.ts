// express types 
import type { Express, Request, Response } from "express"
import express from 'express'

// third party modules 
import cors from 'cors'
import helmet from "helmet";
import rateLimit from "express-rate-limit";


// env config
import { config } from 'dotenv'
import {resolve} from 'node:path'
config({path:resolve('./config/.env.development')})

// modules
import authController from './modules/auth/auth.controller'
import userController from './modules/user/user.controller'
import { globalErrorHandling } from "./utils/response/error.response";
import connectDb from "./Db/connection.db";

// rate limit app
const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too many request please try again later " },
    statusCode: 429,
    
});


// app bootstrap 
const bootstrap = async (): Promise<void> => {
    const app: Express = express();
    const port: number | string =process.env.PORT || 5000 ;


    app.use(express.json(), cors(), helmet(), limiter)



    app.get('/', (req: Request, res: Response) => {
        res.json({
            message: `welcome to ${process.env.APPLICATION_NAME} backend landing page ❤️🌸`
        })
    });

    // app sub modules 
    app.use('/auth',authController);
    app.use('/user',userController);

    app.use('{/*dummy}', (req, res) => {
        res.status(404).json({
            message: "In-valid page please check the URL ❌ "
        })
        
    });


    // global error handling
    app.use(globalErrorHandling)

    // DB 
    await connectDb()
    app.listen(port, () => {
        console.log(`Server is running on port :::${port} 🚀`);
        
    })
};

export default bootstrap