import type { JwtPayload, Secret,  SignOptions } from "jsonwebtoken";
import {sign, verify } from "jsonwebtoken";
import { HUserDocument, RoleEnum, UserModel } from "../../Db/model/User.model";
import { BadRequestException, UnauthorizeException } from "../response/error.response";
import { UserRepository } from "../../Db/repository/user.repository.";
import { v4 as uuid } from "uuid";
import { TokenRepository } from "../../Db/repository/token.repository";
import { HTokenDocument, TokenModel } from "../../Db/model/token.model";
export enum SignatureLevelEnum{
    Bearer = "Bearer",
    System = "System",
};
export enum TokenEnum{
    access = "access",
    refresh = "refresh",
};
export enum LogoutEnum{
    only = "only",
    all = "all",
};


export const generateToken =async ({
    payload,
    secret= process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
    options ={expiresIn:Number(process.env.ACCESS_TOKEN_EXPIRES_IN)}
}: {
    payload: object,
    secret?:Secret,
    options?: SignOptions
}): Promise<string> => {
    return sign(payload, secret, options);
    
}
export const verifyToken =async ({
    token,
    secret= process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
    token: string,
    secret?:Secret,
}): Promise<JwtPayload> => {
    return verify(token, secret ) as JwtPayload;
    
}


export const detectedSignature = async (role:RoleEnum=RoleEnum.user):Promise<SignatureLevelEnum>=> {
    let signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer;

    switch (role) {
        case RoleEnum.admin:
            signatureLevel = SignatureLevelEnum.System;
            break;
    
        default:
            signatureLevel = SignatureLevelEnum.Bearer;
            break;
    }

    return signatureLevel;
}


export const getSignatures = async (signatureLevel:SignatureLevelEnum=SignatureLevelEnum.Bearer):Promise<{ access_signature: string, refresh_signature: string }>=> {
    let signatures: { access_signature: string, refresh_signature: string } = {
        access_signature: "",
        refresh_signature: ""
    }

    switch (signatureLevel) {
        case SignatureLevelEnum.System:
            signatures.access_signature=process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE as string
            signatures.refresh_signature=process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE as string
            break;
    
        default:
            signatures.access_signature=process.env.ACCESS_USER_TOKEN_SIGNATURE as string
            signatures.refresh_signature=process.env.REFRESH_USER_TOKEN_SIGNATURE as string
            break;
    }

    return signatures;
}
export const createLoginCredentials = async (user: HUserDocument) => {
    const signaturesLevel= await detectedSignature(user.role);
    const signatures = await getSignatures(signaturesLevel);
    console.log(signatures);
    const jwtid = uuid();

            const accessToken = await generateToken({
            payload: {
                _id: user._id,
                },
                secret: signatures.access_signature,
                options: {
                    expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN),
                    jwtid
            }
        });
        const refreshToken = await generateToken({
            payload: {
                _id: user._id,
            },
            secret:signatures.refresh_signature,
            options: {
                expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                jwtid
            }
        });
    
    return {accessToken,refreshToken};
}


export const decodedToken = async ({
    authorization,
    tokenType = TokenEnum.access
}: {
    authorization: string
    tokenType?: TokenEnum
}) => {
    const userModel = new UserRepository(UserModel);
    const tokenModel = new TokenRepository(TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new UnauthorizeException(" Missing token parts");
    }

    const signatures = await getSignatures(bearerKey as SignatureLevelEnum);
    const decoded = await verifyToken({
        token, secret: tokenType === TokenEnum.refresh
            ?
            signatures.refresh_signature
            :
            signatures.access_signature
    });

    if (!decoded?._id || !decoded?.iat) {
        throw new BadRequestException("in-valid token payload");
    };

    // ==
    if (await tokenModel.findOne({
        filter: {
            jti: decoded.jti,
        }
    })) {
        throw new UnauthorizeException("In-valid or old login credentials");
    };

    const user = await userModel.findOne({
        filter: {
            _id: decoded._id,
        }
    });

    if (!user) {
        throw new BadRequestException("Not register account")
    };

    if ((user.changeCredentialTime?.getTime() || 0) > decoded.iat * 1000) {
        throw new UnauthorizeException("In-valid or old login credentials");

    }


    return { user, decoded }
};


export const createRevokeToken = async (decoded:JwtPayload):Promise<HTokenDocument> => {
        const tokenModel = new TokenRepository(TokenModel);

                    const [result]=await tokenModel.create({
                    data: [{
                        jti: decoded?.jti as string,
                        expiriesIn: (decoded?.iat as number) + Number(process.env.REFRESH_TOKEN_EXPIRES_IN as string),
                        userId: decoded._id,
                    }]
                    }) || [];
    if(!result){
        throw new BadRequestException("Fail to revoke this token")
    };
    return result;
}