"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const User_model_1 = require("../../Db/model/User.model");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/email/email.event");
const otp_1 = require("../../utils/otp/otp");
const s3_config_1 = require("../../utils/multer/s3.config");
const s3_event_1 = require("../../utils/multer/s3.event");
const success_response_1 = require("../../utils/response/success.response");
const encrypt_security_1 = require("../../utils/security/encrypt.security");
const repository_1 = require("../../Db/repository");
class UserServices {
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    profile = async (req, res) => {
        if (!req.user) {
            throw new error_response_1.UnauthorizeException("missing user details ");
        }
        req.user.phone = await (0, encrypt_security_1.decryptEncryption)({ ciphertext: req.user.phone });
        return (0, success_response_1.successResponse)({
            res,
            data: { user: req.user }
        });
    };
    profileImage = async (req, res) => {
        const { ContentType, Originalname } = req.body;
        const { url, Key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}`
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                profileImage: Key,
                tempProfileImage: req.user?.profileImage
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("failed to update profile image");
        }
        ;
        s3_event_1.s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            Key,
            expiresIn: 30000
        });
        return (0, success_response_1.successResponse)({
            res,
            message: "image uploaded",
            data: { url }
        });
    };
    profileCoverImages = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Failed to update profile cover images ");
        }
        ;
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return (0, success_response_1.successResponse)({
            res,
            message: "image uploaded",
            data: { user }
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
        return (0, success_response_1.successResponse)({
            res,
            message: "user profile",
        });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== User_model_1.RoleEnum.admin) {
            throw new error_response_1.ForbiddenException("Not authorized user ");
        }
        ;
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false }
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1
                }
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("User not found or failed to delete this resource");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId,
                freezedBy: { $ne: userId }
            },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1
                }
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("User not found or failed to restore this resource");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true }
            }
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("User not found or failed to hard delete this resource");
        }
        ;
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return (0, success_response_1.successResponse)({
            res,
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
        return (0, success_response_1.successResponse)({
            res,
            statusCode
        });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
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
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
            message: 'Password Updated '
        });
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
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
            message: 'Email Updated '
        });
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
        return (0, success_response_1.successResponse)({
            res,
            message: 'Email confirmed'
        });
    };
    updateBasicProfileInfo = async (req, res) => {
        if (req.body.phone) {
            req.body.phone = await (0, encrypt_security_1.generateEncryption)({ plainText: req.body.phone });
        }
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                $set: req.body,
                $inc: { __v: 1 }
            }
        });
        return (0, success_response_1.successResponse)({
            res,
            message: 'Basic profile info updated successfully ',
            data: { user }
        });
    };
    twoStepVerification = async (req, res) => {
        if (!req.user) {
            throw new error_response_1.UnauthorizeException("missing user details");
        }
        const otp = await (0, otp_1.generateNumberOtp)();
        const expireOtp = new Date(Date.now() + 2 * 60 * 1000);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                verifyTwoStepsOtp: `${otp}`,
                verifyTwoStepsOtpExpiresAt: expireOtp
            }
        });
        await email_event_1.emailEvent.emit("2-step-verification-otp", { to: req.user.email, otp });
        return (0, success_response_1.successResponse)({
            res,
            message: "Otp send, Please check your email",
        });
    };
    verifyTwoStepVerification = async (req, res) => {
        let { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                verifyTwoStepsOtp: { $exists: true },
                verifyTwoStepsOtpAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("in-valid data or account already verified");
        }
        ;
        if (!await (0, hash_security_1.compareHash)(otp, user.verifyTwoStepsOtp)) {
            throw new error_response_1.BadRequestException("in-valid confirmation code");
        }
        ;
        const now = new Date();
        if (user.verifyTwoStepsOtpExpiresAt && now > user.verifyTwoStepsOtpExpiresAt) {
            throw new error_response_1.BadRequestException("2-steps-verification otp expires ");
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                verifyTwoStepsOtpAt: new Date(),
                $unset: {
                    verifyTwoStepsOtp: 1,
                }
            }
        });
        return (0, success_response_1.successResponse)({
            res,
            message: " 2-steps-verification enabled successfully on your account",
        });
    };
}
;
exports.default = new UserServices();
