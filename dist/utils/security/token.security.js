"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRevokeToken = exports.decodedToken = exports.createLoginCredentials = exports.getSignatures = exports.detectedSignature = exports.verifyToken = exports.generateToken = exports.LogoutEnum = exports.TokenEnum = exports.SignatureLevelEnum = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const User_model_1 = require("../../Db/model/User.model");
const error_response_1 = require("../response/error.response");
const uuid_1 = require("uuid");
const token_model_1 = require("../../Db/model/token.model");
const repository_1 = require("../../Db/repository");
var SignatureLevelEnum;
(function (SignatureLevelEnum) {
    SignatureLevelEnum["Bearer"] = "Bearer";
    SignatureLevelEnum["System"] = "System";
})(SignatureLevelEnum || (exports.SignatureLevelEnum = SignatureLevelEnum = {}));
;
var TokenEnum;
(function (TokenEnum) {
    TokenEnum["access"] = "access";
    TokenEnum["refresh"] = "refresh";
})(TokenEnum || (exports.TokenEnum = TokenEnum = {}));
;
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum["only"] = "only";
    LogoutEnum["all"] = "all";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
;
const generateToken = async ({ payload, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) } }) => {
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = async ({ token, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, }) => {
    return (0, jsonwebtoken_1.verify)(token, secret);
};
exports.verifyToken = verifyToken;
const detectedSignature = async (role = User_model_1.RoleEnum.user) => {
    let signatureLevel = SignatureLevelEnum.Bearer;
    switch (role) {
        case User_model_1.RoleEnum.admin:
            signatureLevel = SignatureLevelEnum.System;
            break;
        default:
            signatureLevel = SignatureLevelEnum.Bearer;
            break;
    }
    return signatureLevel;
};
exports.detectedSignature = detectedSignature;
const getSignatures = async (signatureLevel = SignatureLevelEnum.Bearer) => {
    let signatures = {
        access_signature: "",
        refresh_signature: ""
    };
    switch (signatureLevel) {
        case SignatureLevelEnum.System:
            signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE;
            break;
        default:
            signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE;
            break;
    }
    return signatures;
};
exports.getSignatures = getSignatures;
const createLoginCredentials = async (user) => {
    const signaturesLevel = await (0, exports.detectedSignature)(user.role);
    const signatures = await (0, exports.getSignatures)(signaturesLevel);
    console.log(signatures);
    const jwtid = (0, uuid_1.v4)();
    const accessToken = await (0, exports.generateToken)({
        payload: {
            _id: user._id,
        },
        secret: signatures.access_signature,
        options: {
            expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN),
            jwtid
        }
    });
    const refreshToken = await (0, exports.generateToken)({
        payload: {
            _id: user._id,
        },
        secret: signatures.refresh_signature,
        options: {
            expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
            jwtid
        }
    });
    return { accessToken, refreshToken };
};
exports.createLoginCredentials = createLoginCredentials;
const decodedToken = async ({ authorization, tokenType = TokenEnum.access }) => {
    const userModel = new repository_1.UserRepository(User_model_1.UserModel);
    const tokenModel = new repository_1.TokenRepository(token_model_1.TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new error_response_1.UnauthorizeException(" Missing token parts");
    }
    const signatures = await (0, exports.getSignatures)(bearerKey);
    const decoded = await (0, exports.verifyToken)({
        token, secret: tokenType === TokenEnum.refresh
            ?
                signatures.refresh_signature
            :
                signatures.access_signature
    });
    if (!decoded?._id || !decoded?.iat) {
        throw new error_response_1.BadRequestException("in-valid token payload");
    }
    ;
    if (await tokenModel.findOne({
        filter: {
            jti: decoded.jti,
        }
    })) {
        throw new error_response_1.UnauthorizeException("In-valid or old login credentials");
    }
    ;
    const user = await userModel.findOne({
        filter: {
            _id: decoded._id,
        }
    });
    if (!user) {
        throw new error_response_1.BadRequestException("Not register account");
    }
    ;
    if ((user.changeCredentialTime?.getTime() || 0) > decoded.iat * 1000) {
        throw new error_response_1.UnauthorizeException("In-valid or old login credentials");
    }
    return { user, decoded };
};
exports.decodedToken = decodedToken;
const createRevokeToken = async (decoded) => {
    const tokenModel = new repository_1.TokenRepository(token_model_1.TokenModel);
    const [result] = await tokenModel.create({
        data: [{
                jti: decoded?.jti,
                expiriesIn: decoded?.iat + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                userId: decoded._id,
            }]
    }) || [];
    if (!result) {
        throw new error_response_1.BadRequestException("Fail to revoke this token");
    }
    ;
    return result;
};
exports.createRevokeToken = createRevokeToken;
