import { NextFunction, Request, Response } from "express"
import type { ZodError, ZodType } from "zod"
import { BadRequestException } from "../utils/response/error.response";
import { z } from "zod"
import { GenderEnum } from "../Db/model/User.model";
import { Types } from "mongoose";


type keyReqType = keyof Request;
type SchemaType = Partial<Record<keyReqType, ZodType>>
type ValidationErrorsType = Array<{
    key: keyReqType,
    issues: Array<{
        message: string,
        path: (string | number | symbol | undefined)[];
    }>
}>


export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        console.log(schema);
        console.log(Object.keys(schema));

        const validationErrors: ValidationErrorsType = [];

        for (const key of Object.keys(schema) as keyReqType[]) {
            if (!schema[key]) continue;

            if (req.file) {
                req.body.attachment = req.file
            }
            if (req.files) {
                console.log(req.files);

                req.body.attachments = req.files
            }
            const validationResult = schema[key].safeParse(req[key]);
            const errors = validationResult.error as ZodError
            if (!validationResult.success) {
                validationErrors.push({
                    key, issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path }
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
    loginOtp: z.string().regex(/^\d{2}$/),
    password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    phone: z.string().regex(/^(002|\+2)?01[0125][0-9]{8}$/),
    confirmPassword: z.string(),
    gender: z.enum(GenderEnum).optional(),

    files: function (mimetype:string[]) {
        return z.strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimetype),
        buffer: z.any().optional(),
        path: z.string().optional(),
        size: z.number()
    }).refine((data) => {
        return data.buffer || data.path
    }, {
        error:" neither path or buffer available",path:["file"]
    })
    },

    id:z.string().refine(
            (data) => {
                return Types.ObjectId.isValid(data)
            },{error:"invalid objectId format"}
        )
};