"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmUpdateEmail = exports.updateEmail = exports.updatePassword = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const validation_middleware_1 = require("../../middleware/validation.middleware");
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
