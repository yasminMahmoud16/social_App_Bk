import type { NextFunction, Response, Request } from "express"
import { decodedToken, TokenEnum } from "../utils/security/token.security"
import { BadRequestException, ForbiddenException } from "../utils/response/error.response"
import { RoleEnum } from "../Db/model/User.model"




export const authentication = (tokenType:TokenEnum=TokenEnum.access) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.headers.authorization) {
            throw new BadRequestException("Validation Error", {
                key: "headers",
                issue: [{
                    path: "authorization",
                    message: "Missing authorization"
                }]
            })
        }
        const { user, decoded } = await decodedToken({
            authorization: req.headers.authorization,
            tokenType
        });

        req.user = user;
        req.decoded = decoded;
        next()
    }
}

export const authorization = (accessRole:RoleEnum[]=[],tokenType:TokenEnum=TokenEnum.access) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.headers.authorization) {
            throw new BadRequestException("Validation Error", {
                key: "headers",
                issue: [{
                    path: "authorization",
                    message: "Missing authorization"
                }]
            })
        }
        const { user, decoded } = await decodedToken({
            authorization: req.headers.authorization,
            tokenType,
        });


        if (!accessRole.includes(user.role)) {
            throw new ForbiddenException("Not authorized account ")
        };

        req.user = user;
        req.decoded = decoded;
        next()
    }
}