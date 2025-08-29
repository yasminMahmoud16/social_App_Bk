"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const User_model_1 = require("../../Db/model/User.model");
const user_repository_1 = require("../../Db/repository/user.repository.");
const token_model_1 = require("../../Db/model/token.model");
const token_repository_1 = require("../../Db/repository/token.repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/events/email.event");
const otp_1 = require("../../utils/otp/otp");
class UserServices {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    tokenModel = new token_repository_1.TokenRepository(token_model_1.TokenModel);
    constructor() { }
    profile = async (req, res) => {
        return res.status(200).json({
            message: "user profile",
            user: req.user,
            decoded: req.decoded?.iat
        });
    };
    shareProfile = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.findOne({
            filter: { _id: userId },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User not found");
        }
        return res.status(200).json({
            message: "user profile",
            data: { user }
        });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        ;
        await this.userModel.updateOne({
            filter: {
                _id: req.user?._id
            },
            update,
        });
        return res.status(statusCode).json({
            message: "Done",
        });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return res.status(201).json({
            message: "Done",
            data: {
                credentials
            }
        });
    };
    updatePassword = async (req, res) => {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
                provider: User_model_1.ProviderEnum.SYSTEM,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Account not found or invalid provider ");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(currentPassword, user.password)) {
            throw new error_response_1.NotFoundException("Current password is incorrect ");
        }
        ;
        const result = await this.userModel.updateOne({
            filter: { _id: userId },
            update: {
                password: await (0, hash_security_1.generateHash)(newPassword),
                changeCredentialTime: new Date(),
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Failed to update password. Please try again");
        }
        ;
        return res.status(201).json({ message: 'Password Updated ' });
    };
    updateEmail = async (req, res) => {
        const userId = req.user?.id;
        const { newEmail, currentPassword } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
                provider: User_model_1.ProviderEnum.SYSTEM,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Account not found or invalid provider ");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(currentPassword, user.password)) {
            throw new error_response_1.NotFoundException("invalid password");
        }
        ;
        if (await this.userModel.findOne({
            filter: { email: newEmail }
        })) {
            throw new error_response_1.ConflictException("Email already exists");
        }
        ;
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { _id: userId },
            update: {
                tempEmail: newEmail,
                emailUpdateOtp: await (0, hash_security_1.generateHash)(String(otp)),
                emailUpdateRequestedAt: new Date(),
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Failed to update password. Please try again");
        }
        ;
        email_event_1.emailEvent.emit("updateEmail", { to: newEmail, otp });
        return res.status(201).json({ message: 'Email Updated ' });
    };
    confirmUpdatedEmail = async (req, res) => {
        let { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                tempEmail: email,
                emailUpdateOtp: { $exists: true }
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid request or no email update pending");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(otp, user.emailUpdateOtp)) {
            throw new error_response_1.BadRequestException("in-valid confirmation code");
        }
        await this.userModel.updateOne({
            filter: { _id: user._id },
            update: {
                email: user.tempEmail,
                confirmedAt: new Date(),
                $unset: {
                    tempEmail: 1,
                    emailUpdateOtp: 1,
                    emailUpdateRequestedAt: 1,
                },
            }
        });
        return res.status(200).json({ message: 'Email confirmed' });
    };
}
;
exports.default = new UserServices();
