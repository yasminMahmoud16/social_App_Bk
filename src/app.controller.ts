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
config({path:resolve('./src/config/.env.development')})

// modules
import authController from './modules/auth/auth.controller'
import userController from './modules/user/user.controller'
import { BadRequestException, globalErrorHandling } from "./utils/response/error.response";
import connectDb from "./Db/connection.db";
import { createGetPreSignedLink, deleteFolderByPrefix, getFile } from "./utils/multer/s3.config";
// apply async/await on callback  
import { promisify } from "node:util";
import { pipeline } from "node:stream";
const createWriteStreamPip = promisify(pipeline) //return pipeline with async/await 
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
    app.use('/user', userController);


            app.get('/upload/pre-signed/*path', async (req: Request, res: Response): Promise<Response> => {
        const { downloadName ,download= "false",expiresIn=120} = req.query as { downloadName?: string, download?:string ,expiresIn?:number};
                const { path } = req.params as unknown as { path: string[] }
                console.log({path});
                
        const Key = path.join('/')

            const url = await createGetPreSignedLink({
                Key,
                downloadName: downloadName as string,
                download,
                expiresIn
            });
                console.log({url});
                
        return res.json({ message: "Done", data: { url } })
        
    });
    app.get('/upload/*path', async (req: Request, res: Response): Promise<void> => {
        const { downloadName, download = "false" } = req.query as { downloadName?: string, download?: string };
        const { path } = req.params as unknown as { path: string[] }
        const Key = path.join('/')
        const s3Response = await getFile({ Key });
        console.log(s3Response.Body);
        if (!s3Response?.Body) {
            throw new BadRequestException("fail to fetch this asset")
        }
        res.setHeader("Content-type", `${s3Response.ContentType || "application/octet-stream"}`);
        if (download === "true") {
            
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`); //download
        }
        return await createWriteStreamPip(s3Response.Body as NodeJS.ReadableStream, res)
    });




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