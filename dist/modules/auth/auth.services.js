"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../Db/model/User.model");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const otp_1 = require("../../utils/otp/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const email_event_1 = require("../../utils/email/email.event");
const success_response_1 = require("../../utils/response/success.response");
const encrypt_security_1 = require("../../utils/security/encrypt.security");
const repository_1 = require("../../Db/repository");
class AuthenticationServices {
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGmailSignup(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(" ") || []
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("Failed to verify this gmail account ");
        }
        ;
        return payload;
    }
    signup = async (req, res) => {
        let { username, email, password, phone } = req.body;
        const checkUser = await this.userModel.findOne({
            filter: { email },
            select: "email",
            options: {
                lean: true
            }
        });
        console.log(checkUser);
        if (checkUser) {
            throw new error_response_1.ConflictException("email is exists");
        }
        const otp = await (0, otp_1.generateNumberOtp)();
        const expireOtp = new Date(Date.now() + 2 * 60 * 1000);
        const user = await this.userModel.createUser({
            data: [{
                    username, email,
                    password,
                    phone: await (0, encrypt_security_1.generateEncryption)({ plainText: phone }),
                    confirmEmailOtp: `${otp}`,
                    confirmEmailOtpExpiresIn: expireOtp
                }]
        });
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    confirmEmail = async (req, res) => {
        let { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("in-valid data or account already verified");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp)) {
            throw new error_response_1.BadRequestException("in-valid confirmation code");
        }
        ;
        const now = new Date();
        if (user.confirmEmailOtpExpiresIn && now > user.confirmEmailOtpExpiresIn) {
            throw new error_response_1.BadRequestException("Signup otp expires ");
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
        return (0, success_response_1.successResponse)({ res, message: 'Email confirmed' });
    };
    login = async (req, res) => {
        let { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid login data");
        }
        ;
        if (!user.confirmedAt) {
            throw new error_response_1.BadRequestException("Verify your account first ");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(password, user.password)) {
            throw new error_response_1.BadRequestException("In-valid login data");
        }
        ;
        if (user.verifyTwoStepsOtpAt) {
            const expireOtp = new Date(Date.now() + 1 * 60 * 1000);
            const otp = await (0, otp_1.generateLoginOtp)();
            await email_event_1.emailEvent.emit("verification-code", { to: email, otp });
            await this.userModel.updateOne({
                filter: {
                    email
                },
                update: {
                    confirmLoginOtp: await (0, hash_security_1.generateHash)(String(otp)),
                    confirmLoginOtpExpiresAt: expireOtp
                }
            });
            return (0, success_response_1.successResponse)({
                res, message: 'verification code send please verify your identity',
            });
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({
            res, message: 'User logged',
            data: { credentials }
        });
    };
    loginConfirmation = async (req, res) => {
        let { email, loginOtp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                verifyTwoStepsOtpAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("in-valid data or account already verified");
        }
        ;
        const now = new Date();
        if (user.confirmLoginOtpExpiresAt && now > user.confirmLoginOtpExpiresAt) {
            throw new error_response_1.BadRequestException("login otp expires ");
        }
        if (!await (0, hash_security_1.compareHash)(loginOtp, user.confirmLoginOtp)) {
            throw new error_response_1.BadRequestException("in-valid confirmation code");
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
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, message: 'login confirmed', data: { credentials } });
    };
    signupGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailSignup(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email
            }
        });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.GOOGLE) {
                return await this.loginGmail(req, res);
            }
            throw new error_response_1.ConflictException(`email is exists with another provider :::${user.provider} `);
        }
        ;
        const [newUser] = await this.userModel.create({
            data: [{
                    firstName: given_name,
                    lastName: family_name,
                    email: email,
                    profileImage: picture,
                    confirmedAt: new Date(),
                    provider: User_model_1.ProviderEnum.GOOGLE
                }]
        }) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Failed to signup account with google please try again later");
        }
        ;
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return (0, success_response_1.successResponse)({
            res, message: 'User logged',
            statusCode: 201,
            data: { credentials }
        });
    };
    loginGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailSignup(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.GOOGLE
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Not register account or registers with another provider");
        }
        ;
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({
            res, message: 'User logged',
            data: { credentials }
        });
    };
    sendForgetCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true }
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account ]  ");
        }
        ;
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp)),
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Failed to send code please try again later");
        }
        ;
        email_event_1.emailEvent.emit("sendForgetCode", { to: email, otp });
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    verifyForgetCode = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
                resetPasswordOtp: { $exists: true },
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account , missing reset password otp ]  ");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp)) {
            throw new error_response_1.NotFoundException("In-valid otp code  ");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201
        });
    };
    resetForgetPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
                resetPasswordOtp: { $exists: true },
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account cause of  one of theses reasons [not register - invalid provider - not confirmed account , missing reset password otp ]  ");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp)) {
            throw new error_response_1.NotFoundException("In-valid otp code  ");
        }
        ;
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialTime: new Date(),
                $unset: {
                    resetPasswordOtp: 1,
                }
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Failed to reset password please try again later");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201
        });
    };
}
exports.default = new AuthenticationServices();
