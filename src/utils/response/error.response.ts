import { NextFunction, Request, Response } from "express"





export interface IError extends Error {
    statusCode: number;
}


export class ApplicationException extends Error{
    constructor(
        public override message: string,
        public statusCode:Number = 400,
        public override cause?:unknown
    ) {
        super()
        // Make the error name comes from my application layer 
        this.name = this.constructor.name;
        // safety check to sure error comes from it's  place 
        Error.captureStackTrace(this,this.constructor)
    }
};
export class BadRequestException extends ApplicationException{
    constructor(
        public override message: string,
        public override cause?:unknown
    ) {
        super(message,400,cause)

    }
};
export class NotFoundException extends ApplicationException{
    constructor(
        public override message: string,
        public override cause?:unknown
    ) {
        super(message,404,cause)

    }
};
export class ConflictException extends ApplicationException{
    constructor(
        public override message: string,
        public override cause?:unknown
    ) {
        super(message,409,cause)

    }
};
export class UnauthorizeException extends ApplicationException{
    constructor(
        public override message: string,
        public override cause?:unknown
    ) {
        super(message,401,cause)

    }
};
export class ForbiddenException extends ApplicationException{
    constructor(
        public override message: string,
        public override cause?:unknown
    ) {
        super(message,403,cause)

    }
};
export const globalErrorHandling =
    (
        error: IError,
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
    return res.status(error.statusCode ||500).json({
        err_message: error.message || "something went wrong",
        stack: process.env.MOOD === "development" ? error.stack : undefined,
        error,
    })
}