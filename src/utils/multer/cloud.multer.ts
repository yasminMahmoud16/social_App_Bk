import type { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import os from "node:os";
import { BadRequestException } from "../response/error.response";
import { v4 as uuid } from "uuid";
/**
 { } = {} means full back mechanism 
    memory => return buffer prefer the size be not more than  1 mb do not reach to max 500 mb 
    disk => return path temp file if the files with large size so catch in hard disk 
 */


export enum StorageEnum {
    memory = "memory",
    disk = "disk"
}
export const fileValidation = {
    image: ["image/png", "image/gif", "image/jpeg"]
}

export const cloudMulter = (
    {
        validation =[],
        storageApproach = StorageEnum.memory,
    maxSizeMB=2
} :
    {
        validation?:string[],
            storageApproach?: StorageEnum;
            maxSizeMB?:number
        
        }): multer.Multer => {
    // console.log(os.tmpdir());
    
    const storage =
        storageApproach === StorageEnum.memory ? multer.memoryStorage() : multer.diskStorage({
        // destination takes temp path
        destination: os.tmpdir(),
        filename: function (req: Request, file: Express.Multer.File, callBack){
            callBack(null, `${uuid()}_${file.originalname}`);
        }
    });

    

    function fileFilter(req: Request, file: Express.Multer.File, callBack: FileFilterCallback) {

        if (!validation.includes(file.mimetype)) {
            
            return callBack(new BadRequestException("Validation Error", {
                validationError: [{
                    key: "file",
                    issue: [{
                        path: "file",
                        message: "In-valid file formate"
                    }]
                }]
            }));
        }
        return callBack(null,true)
    }
    return multer({fileFilter,limits:{fileSize:maxSizeMB *1024 *1024} ,storage})
}