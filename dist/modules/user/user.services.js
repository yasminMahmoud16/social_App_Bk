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
const model_1 = require("../../Db/model");
class UserServices {
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    postModel = new repository_1.PostRepository(model_1.PostModel);
    friendRequestModel = new repository_1.FriendRequestRepository(model_1.FriendRequestModel);
    constructor() { }
    profile = async (req, res) => {
        const profile = await this.userModel.findById({
            id: req.user?._id,
            options: {
                populate: [{
                        path: "friends",
                        select: "firstName lastName email gender profileImage"
                    }]
            }
        });
        if (!profile) {
            throw new error_response_1.NotFoundException("Failed to find user profile ");
        }
        if (!req.user) {
            throw new error_response_1.UnauthorizeException("missing user details ");
        }
        req.user.phone = await (0, encrypt_security_1.decryptEncryption)({ ciphertext: req.user.phone });
        return (0, success_response_1.successResponse)({
            res,
            data: { user: profile }
        });
    };
    dashboard = async (req, res) => {
        const result = Promise.allSettled([
            await this.userModel.find({ filter: {} }),
            await this.postModel.find({ filter: {} }),
        ]);
        return (0, success_response_1.successResponse)({
            res,
            data: { result }
        });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRole = [role, User_model_1.RoleEnum.superAdmin];
        if (req.user?.role === User_model_1.RoleEnum.admin) {
            denyRole.push(User_model_1.RoleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRole }
            },
            update: {
                role,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("failed to find matching result");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    profileImage = async (req, res) => {
        const { ContentType, Originalname } = req.body;
        const { url, Key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}`,
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
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        const checkFriendRequest = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            }
        });
        if (checkFriendRequest) {
            throw new error_response_1.ConflictException("Friend request already exists ");
        }
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User is not found");
        }
        ;
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [{
                    createdBy: req.user?._id,
                    sendTo: userId
                }]
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("Something went wrong !!!");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201
        });
    };
    deleteFriendRequest = async (req, res) => {
        const { friendRequestId } = req.params;
        const checkFriendRequest = await this.friendRequestModel.findOne({
            filter: {
                _id: friendRequestId,
                acceptedAt: { $exists: false }
            }
        });
        if (!checkFriendRequest) {
            throw new error_response_1.NotFoundException("Friend request not found ");
        }
        const deleteFriendRequest = await this.friendRequestModel.deleteOne({
            filter: { _id: friendRequestId }
        });
        if (!deleteFriendRequest) {
            throw new error_response_1.BadRequestException("Something went wrong !!!");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    unFriend = async (req, res) => {
        const { friendId } = req.params;
        const checkFriendExists = await this.userModel.findOne({
            filter: {
                _id: req.user?._id,
                friends: friendId
            }
        });
        if (!checkFriendExists) {
            throw new error_response_1.NotFoundException("Friend not found ");
        }
        const unFriendUser = await this.userModel.updateOne({
            filter: { _id: req.user?._id },
            update: {
                $pull: { friends: friendId }
            }
        });
        if (!unFriendUser) {
            throw new error_response_1.BadRequestException("Something went wrong !!!");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
            message: "unfriend user"
        });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
        const acceptFriendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                sendTo: req.user?._id,
                acceptedAt: { $exists: false }
            },
            update: {
                acceptedAt: new Date(),
            }
        });
        if (!acceptFriendRequest) {
            throw new error_response_1.NotFoundException("Failed to find matching result ");
        }
        await Promise.all([
            await this.userModel.updateOne({
                filter: { _id: acceptFriendRequest.createdBy },
                update: {
                    $addToSet: { friends: acceptFriendRequest.sendTo }
                }
            }),
            await this.userModel.updateOne({
                filter: { _id: acceptFriendRequest.sendTo },
                update: {
                    $addToSet: { friends: acceptFriendRequest.createdBy }
                }
            })
        ]);
        console.log({
            promise: await Promise.all([
                await this.userModel.updateOne({
                    filter: { _id: acceptFriendRequest.createdBy },
                    update: {
                        $addToSet: { friends: acceptFriendRequest.sendTo }
                    }
                }),
                await this.userModel.updateOne({
                    filter: { _id: acceptFriendRequest.sendTo },
                    update: {
                        $addToSet: { friends: acceptFriendRequest.createdBy }
                    }
                })
            ])
        });
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    blockUser = async (req, res) => {
        const { userId } = req.params;
        if (req.user?.role != User_model_1.RoleEnum.admin) {
            throw new error_response_1.UnauthorizeException("Not authorized user only admins allowed");
        }
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
                blockedAt: { $exists: false }
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("user not found ");
        }
        const blockUser = await this.userModel.updateOne({
            filter: { _id: userId },
            update: { blockedAt: new Date() }
        });
        if (blockUser.modifiedCount === 0) {
            throw new error_response_1.BadRequestException("Something went wrong !!!");
        }
        ;
        return (0, success_response_1.successResponse)({
            res,
            message: "User blocked successfully"
        });
    };
    unblockRequest = async (req, res) => {
        const { email, unblockMessage } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                blockedAt: { $exists: true }
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("user not found ");
        }
        const unblockRequestEmail = email_event_1.emailEvent.emit("unblock-request", {
            to: process.env.ADMIN_EMAIL,
            userEmail: email,
            userMessage: unblockMessage
        });
        if (unblockRequestEmail) {
            await this.userModel.updateOne({
                filter: { role: User_model_1.RoleEnum.admin },
                update: {
                    $addToSet: { unblockRequests: user._id }
                }
            });
        }
        return (0, success_response_1.successResponse)({
            res,
            data: {}
        });
    };
    acceptUnblockRequest = async (req, res) => {
        const { userId } = req.params;
        if (req.user?.role != User_model_1.RoleEnum.admin) {
            throw new error_response_1.UnauthorizeException("Not authorized user only admins allowed");
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
            },
            update: {
                $unset: { blockedAt: 1 }
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("user not found ");
        }
        const acceptUnblockRequest = email_event_1.emailEvent.emit("accept-unblock-request", {
            to: user.email,
            userEmail: user.email,
            adminMessage: "Congrats your request accepted by the admin 😊 "
        });
        if (acceptUnblockRequest) {
            await this.userModel.updateOne({
                filter: { role: User_model_1.RoleEnum.admin },
                update: {
                    $pull: { unblockRequests: user._id }
                }
            });
        }
        return (0, success_response_1.successResponse)({
            res,
            data: {}
        });
    };
}
;
exports.default = new UserServices();
