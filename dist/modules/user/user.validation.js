"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeRole = exports.blockUser = exports.unFriend = exports.acceptFriendRequest = exports.deleteFriendRequest = exports.sendFriendRequest = exports.updateBasicProfileInfo = exports.verifyTwoStepVerification = exports.hardDeleteAccount = exports.restoreAccount = exports.freezeAccount = exports.confirmUpdateEmail = exports.updateEmail = exports.updatePassword = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const mongoose_1 = require("mongoose");
const model_1 = require("../../Db/model");
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum(token_security_1.LogoutEnum).default(token_security_1.LogoutEnum.only)
    })
};
exports.updatePassword = {
    body: zod_1.z.strictObject({
        currentPassword: validation_middleware_1.generalFields.password,
        newPassword: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "New password mismatch confirm password",
        path: ["confirmPassword"],
    }),
};
exports.updateEmail = {
    body: zod_1.z.strictObject({
        currentPassword: validation_middleware_1.generalFields.password,
        newEmail: validation_middleware_1.generalFields.email,
        confirmEmail: validation_middleware_1.generalFields.email,
    }).refine((data) => data.newEmail === data.confirmEmail, {
        message: "New email mismatch confirm email",
        path: ["confirmEmail"],
    }),
};
exports.confirmUpdateEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp
    })
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional()
    }).optional().refine((data) => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, {
        error: "In-valid object formate",
        path: ['userId']
    }),
};
exports.restoreAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string()
    }).refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data.userId);
    }, {
        error: "In-valid object formate",
        path: ['userId']
    }),
};
exports.hardDeleteAccount = exports.restoreAccount;
exports.verifyTwoStepVerification = exports.confirmUpdateEmail;
exports.updateBasicProfileInfo = {
    body: zod_1.z.strictObject({
        username: validation_middleware_1.generalFields.username,
        gender: validation_middleware_1.generalFields.gender,
        phone: validation_middleware_1.generalFields.phone
    })
};
exports.sendFriendRequest = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id
    }),
};
exports.deleteFriendRequest = {
    params: zod_1.z.strictObject({
        friendRequestId: validation_middleware_1.generalFields.id
    }),
};
exports.acceptFriendRequest = {
    params: zod_1.z.strictObject({
        requestId: validation_middleware_1.generalFields.id
    }),
};
exports.unFriend = {
    params: zod_1.z.strictObject({
        friendId: validation_middleware_1.generalFields.id
    }),
};
exports.blockUser = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id
    }),
};
exports.changeRole = {
    params: exports.sendFriendRequest.params,
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(model_1.RoleEnum)
    })
};
