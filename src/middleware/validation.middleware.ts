import { NextFunction, Request, Response } from "express"
import type { ZodError, ZodType } from "zod"
import { BadRequestException } from "../utils/response/error.response";
import {z} from "zod"
import { GenderEnum } from "../Db/model/User.model";


type keyReqType = keyof Request;
type SchemaType =Partial<Record<keyReqType,ZodType>>
type ValidationErrorsType =Array<{
            key: keyReqType,
            issues: Array<{
                message: string,
                path: string | number | symbol | undefined;
            }>
        }>


export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        console.log(schema);
        console.log(Object.keys(schema));

        const validationErrors: ValidationErrorsType = [];

        for (const key of Object.keys(schema) as keyReqType[]) {
            if (!schema[key]) continue;

            const validationResult = schema[key].safeParse(req[key]);
            const errors = validationResult.error as ZodError
            if (!validationResult.success) {
                validationErrors.push({
                    key, issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path[0] }
                    }
                    )
                })
            }
        }


        if (validationErrors.length) {
            throw new BadRequestException("Validation Error", {
                validationErrors
            })
        }
        return next() as unknown as NextFunction
        
    }
};



export const generalFields = {
    username: z.string().min(2).max(20),
    email: z.email(),
    otp: z.string().regex(/^\d{6}$/),
    password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: z.string(),
    gender:z.enum(GenderEnum).optional()
};