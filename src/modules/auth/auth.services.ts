
import type { Request, Response } from "express"
import type { IConfirmEmailInputDto, IConfirmLoginInputDto, ILoginBodyInputDto, IResetForgetPasswordInputDto, ISendForgetCodeInputDto, ISignupBodyInputDto, ISignupWithGmailInputDto, IVerifyForgetCodeInputDto } from "./auth.dto";
import { ProviderEnum, UserModel } from "../../Db/model/User.model";
import { BadRequestException, ConflictException, NotFoundException } from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { generateLoginOtp, generateNumberOtp } from "../../utils/otp/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { emailEvent } from "../../utils/email/email.event";
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from "./auth.entities";
import { generateEncryption } from "../../utils/security/encrypt.security";
import { UserRepository } from "../../Db/repository";



class AuthenticationServices {
    private userModel = new UserRepository(UserModel)
    constructor() { }
    private async verifyGmailSignup(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(" ") || []
        });
        const payload = ticket.getPayload();

        if (!payload?.email_verified) {
            throw new BadRequestException("Failed to verify this gmail account ")
        };
        return payload;

    }
    /**
     * 
     * @param req - Express.Request
     * @param res  - Express.Response 
     * @returns Promise<Response> 
     * @example({ username, email, password })
     * return { message: 'signup',}
     */

    signup = async (req: Request, res: Response): Promise<Response> => {
        let { username, email, password ,phone}: ISignupBodyInputDto = req.body;

        const checkUser = await this.userModel.findOne({
            filter: { email },
            select: "email",
            options: {
                lean: true
            }
        })

        console.log(checkUser);
        if (checkUser) {
            throw new ConflictException("email is exists")
        }

        const otp = await generateNumberOtp();
         const expireOtp = new Date(Date.now() + 2 * 60 * 1000); 
        const user = await this.userModel.createUser({
            data: [{
                username, email,
                password,
                phone: await generateEncryption({plainText:phone}),
                confirmEmailOtp:`${otp}`,
                confirmEmailOtpExpiresIn:expireOtp
            }]
        });

        return successResponse({ res, statusCode: 201 })
        // return res.status(201).json({ message: 'signup', data: { user } })
    };



    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        let { email, otp }: IConfirmEmailInputDto = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },

        });

        if (!user) {
            throw new NotFoundException("in-valid data or account already verified")
        };

        if (!await compareHash(otp, user.confirmEmailOtp as string)) {
            throw new BadRequestException("in-valid confirmation code")
        };
        const now = new Date();
        if (user.confirmEmailOtpExpiresIn && now > user.confirmEmailOtpExpiresIn) {
            throw new BadRequestException("Signup otp expires ")
        }

        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: {
                    confirmEmailOtp: 1,
                }
            }
        });


        return successResponse({ res, message: 'Email confirmed' })
    };
    login = async (req: Request, res: Response): Promise<Response> => {
        let { email, password }: ILoginBodyInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                blockedAt:{$exists:false}
            }
        });

        if (!user) {
            throw new NotFoundException("In-valid login data or you were blocked by the admin, please send an unblock request to admin")
        };

        if (!user.confirmedAt) {
            throw new BadRequestException("Verify your account first ")
        };

        if (!await compareHash(password, user.password)) {
            throw new BadRequestException("In-valid login data")
        };

        if (user.verifyTwoStepsOtpAt) {

            const expireOtp = new Date(Date.now() + 1 * 60 * 1000); // ExpiresIn 1 min 

            const otp = await generateLoginOtp();
            await emailEvent.emit("verification-code", { to: email, otp });
            await this.userModel.updateOne({
                filter: {
                    email
                },
                update: {
                    confirmLoginOtp: await generateHash(String(otp)),
                    confirmLoginOtpExpiresAt:expireOtp
                }
            });

            return successResponse<ILoginResponse>({
            res, message: 'verification code send please verify your identity',
        });
        }
        
            const credentials = await createLoginCredentials(user)

        return successResponse<ILoginResponse>({
            res, message: 'User logged',
            data: { credentials }
        });
    };
    loginConfirmation = async (req: Request, res: Response): Promise<Response> => {
        let { email, loginOtp }: IConfirmLoginInputDto = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email,
                verifyTwoStepsOtpAt: { $exists: true },
            },

        });

        if (!user) {
            throw new NotFoundException("in-valid data or account already verified")
        };

        
        const now = new Date();
        if (user.confirmLoginOtpExpiresAt && now > user.confirmLoginOtpExpiresAt) {
            throw new BadRequestException("login otp expires ")
        }
        if (!await compareHash(loginOtp, user.confirmLoginOtp as string)) {
            throw new BadRequestException("in-valid confirmation code")
        }

        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmLoginOtpAt: new Date(),
                $unset: {
                    confirmLoginOtp: 1,
                }
            }
        });

        const credentials = await createLoginCredentials(user)



        return successResponse({ res, message: 'login confirmed', data: { credentials } })
    };








    signupGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: ISignupWithGmailInputDto = req.body;
        const { email, family_name, given_name, picture }: TokenPayload = await this.verifyGmailSignup(idToken);

        const user = await this.userModel.findOne({
            filter: {
                email
            }
        });
        if (user) {
            if (user.provider === ProviderEnum.GOOGLE) {

                return await this.loginGmail(req, res)
            }
            throw new ConflictException(`email is exists with another provider :::${user.provider} `)
        };
        const [newUser] = await this.userModel.create({
            data: [{
                firstName: given_name as string,
                lastName: family_name as string,
                email: email as string,
                profileImage: picture as string,
                confirmedAt: new Date(),
                provider: ProviderEnum.GOOGLE
            }]
        }) || [];
        if (!newUser) {
            throw new BadRequestException("Failed to signup account with google please try again later");
        };

        const credentials = await createLoginCredentials(newUser);

        return successResponse<ILoginResponse>({
            res, message: 'User logged',
            statusCode: 201,
            data: { credentials }
        });
    };
    loginGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: ISignupWithGmailInputDto = req.body;
        const { email }: TokenPayload = await this.verifyGmailSignup(idToken);

        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.GOOGLE
            }
        });
        if (!user) {

            throw new NotFoundException("Not register account or registers with another provider")

        };



        const credentials = await createLoginCredentials(user);
        return successResponse<ILoginResponse>({
            res, message: 'User logged',
            data: { credentials }
        });

        // return res.status(201).json({ message: 'User Signup', data: { credentials } });

    };
    sendForgetCode = async (req: Request, res: Response): Promise<Response> => {

        const { email }: ISendForgetCodeInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true }
            }
        });
        if (!user) {

            throw new NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account ]  ")
        };

        const otp = generateNumberOtp();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await generateHash(String(otp)),
            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Failed to send code please try again later")
        };

        emailEvent.emit("sendForgetCode", { to: email, otp })
        return successResponse({
            res,
        });

    };
    verifyForgetCode = async (req: Request, res: Response): Promise<Response> => {

        const { email, otp }: IVerifyForgetCodeInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
                resetPasswordOtp: { $exists: true },
            }
        });
        if (!user) {

            throw new NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account , missing reset password otp ]  ")
        };
        if (!await compareHash(otp, user.resetPasswordOtp as string)) {

            throw new NotFoundException("In-valid otp code  ")
        };

        return successResponse({
            res,
            statusCode: 201
        });

    };
    resetForgetPassword = async (req: Request, res: Response): Promise<Response> => {

        const { email, otp, password }: IResetForgetPasswordInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
                resetPasswordOtp: { $exists: true },
            }
        });
        if (!user) {

            throw new NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account , missing reset password otp ]  ")
        };
        if (!await compareHash(otp, user.resetPasswordOtp as string)) {

            throw new NotFoundException("In-valid otp code  ")
        };

        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await generateHash(password),
                changeCredentialTime: new Date(),
                $unset: {
                    resetPasswordOtp: 1,
                }
            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Failed to reset password please try again later")
        };


        return successResponse({
            res,
            statusCode: 201
        });
    };




}

export default new AuthenticationServices()