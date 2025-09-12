"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmLogin = exports.resetForgetPassword = exports.verifyForgetCode = exports.sendForgetCode = exports.signupGmail = exports.confirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
    })
};
exports.signup = {
    body: exports.login.body.extend({
        username: validation_middleware_1.generalFields.username,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
        gender: validation_middleware_1.generalFields.gender,
        phone: validation_middleware_1.generalFields.phone
    }).superRefine((data, ctx) => {
        console.log(data, ctx);
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmPassword"],
                message: "Password mismatch confirm password"
            });
        }
    })
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp
    })
};
exports.signupGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string(),
    })
};
exports.sendForgetCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
    })
};
exports.verifyForgetCode = {
    body: exports.sendForgetCode.body.extend({
        otp: validation_middleware_1.generalFields.otp
    })
};
exports.resetForgetPassword = {
    body: exports.verifyForgetCode.body.extend({
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, { message: "Password mismatch confirm password", path: ["confirmPassword"] })
};
exports.confirmLogin = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        loginOtp: validation_middleware_1.generalFields.loginOtp
    })
};
