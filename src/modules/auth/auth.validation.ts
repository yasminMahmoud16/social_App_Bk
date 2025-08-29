import { z } from "zod"
import { generalFields } from "../../middleware/validation.middleware";

export const login = {
    body: z.strictObject({
        email: generalFields.email,
        password: generalFields.password,
    })
};


export const signup = {
    body: login.body.extend({
        username: generalFields.username,
        confirmPassword: generalFields.confirmPassword,
        gender:generalFields.gender

    }).superRefine((data,ctx) => {
        console.log(data, ctx);
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmPassword"],
                message:"Password mismatch confirm password"
            })
        }
        
    })
}
export const confirmEmail = {
    body: z.strictObject({
        email: generalFields.email,
        otp: generalFields.otp

    })
}
export const signupGmail = {
    body: z.strictObject({
        idToken:z.string(),

    })
}
export const sendForgetCode = {
    body: z.strictObject({
       email: generalFields.email,

    })
}
export const verifyForgetCode = {
    body: sendForgetCode.body.extend({
        otp: generalFields.otp

    })
}
export const resetForgetPassword = {
    body: verifyForgetCode.body.extend({
        password: generalFields.password,
        confirmPassword: generalFields.confirmPassword

    }).refine((data) => {
       return  data.password === data.confirmPassword
    },{message:"Password mismatch confirm password",path:["confirmPassword"]})
}


