// export interface ISignupBodyInputDto{
//     username: string,
//     email:string,
//     password:string
// }

//infer
import * as validators from "./auth.validation"
import {z} from "zod"
 export type ISignupBodyInputDto= z.infer<typeof validators.signup.body >
 export type ILoginBodyInputDto= z.infer<typeof validators.login.body >
 export type IConfirmEmailInputDto= z.infer<typeof validators.confirmEmail.body >
 export type ISignupWithGmailInputDto= z.infer<typeof validators.signupGmail.body >
 export type ISendForgetCodeInputDto= z.infer<typeof validators.sendForgetCode.body >
 export type IVerifyForgetCodeInputDto= z.infer<typeof validators.verifyForgetCode.body >
export type IResetForgetPasswordInputDto = z.infer<typeof validators.resetForgetPassword.body>
  export type IConfirmLoginInputDto= z.infer<typeof validators.confirmLogin.body >

