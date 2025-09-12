import {z} from "zod"
import { LogoutEnum } from "../../utils/security/token.security"
import { generalFields } from "../../middleware/validation.middleware";
import { Types } from "mongoose";


export const logout = {
    body: z.strictObject({
        flag: z.enum(LogoutEnum).default(LogoutEnum.only)
    })
};

export const updatePassword = {
  body: z.strictObject({
        currentPassword: generalFields.password,   
    newPassword: generalFields.password,      
    confirmPassword: generalFields.confirmPassword,
  }).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "New password mismatch confirm password",
      path: ["confirmPassword"],
    }
  ),
};
export const updateEmail = {
  body: z.strictObject({
    currentPassword: generalFields.password, 
    newEmail: generalFields.email,                      
    confirmEmail: generalFields.email,
  }).refine(
    (data) => data.newEmail === data.confirmEmail,
    {
      message: "New email mismatch confirm email",
      path: ["confirmEmail"],
    }
  ),
};
export const confirmUpdateEmail = {
 body: z.strictObject({
        email: generalFields.email,
        otp: generalFields.otp

    })
};



export const freezeAccount = {
  params: z.object(
    {
      userId: z.string().optional()
    }
  ).optional().refine((data) => {
    return data?.userId ? Types.ObjectId.isValid(data.userId) : true
  }, {
    error: "In-valid object formate",
    path: ['userId']
  }),
};
export const restoreAccount = {
  params: z.object(
    {
      userId: z.string()
    }
  ).refine((data) => {
    return  Types.ObjectId.isValid(data.userId)
  }, {
    error: "In-valid object formate",
    path:['userId']
  }),
}

export const hardDeleteAccount = restoreAccount;
export const verifyTwoStepVerification = confirmUpdateEmail;
export const updateBasicProfileInfo =  {
  body: z.strictObject({
    username: generalFields.username,
        gender: generalFields.gender,
        phone:generalFields.phone
  })
};
