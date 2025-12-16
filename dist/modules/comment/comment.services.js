"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../Db/repository");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const model_1 = require("../../Db/model");
const mongoose_1 = require("mongoose");
const post_services_1 = require("../post/post.services");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const email_event_1 = require("../../utils/email/email.event");
class CommentServices {
    userModel = new repository_1.UserRepository(model_1.UserModel);
    postModel = new repository_1.PostRepository(model_1.PostModel);
    commentModel = new repository_1.CommentRepository(model_1.CommentModel);
    constructor() { }
    createComment = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                allowComments: model_1.AllowCommentsEnum.allow,
                $or: (0, post_services_1.postAvailability)(req)
            }
        });
        if (!post) {
            throw new error_response_1.NotFoundException("failed to find matching result");
        }
        ;
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            });
        }
        ;
        const [comment] = await this.commentModel.create({
            data: [{
                    ...req.body,
                    attachments,
                    postId,
                    createdBy: req.user?._id
                }]
        }) || [];
        if (!comment) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to create this comment ");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, message: "Comment created" });
    };
    replyOnComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
                postId
            },
            options: {
                populate: [{
                        path: "postId", match: {
                            allowComments: model_1.AllowCommentsEnum.allow,
                            $or: (0, post_services_1.postAvailability)(req)
                        }
                    }]
            }
        });
        console.log({ comment });
        if (!comment?.postId) {
            throw new error_response_1.NotFoundException("failed to find matching result");
        }
        ;
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        if (req.files?.length) {
            const post = comment.postId;
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            });
        }
        ;
        const [reply] = await this.commentModel.create({
            data: [{
                    ...req.body,
                    attachments,
                    postId,
                    commentId,
                    createdBy: req.user?._id
                }]
        }) || [];
        if (!reply) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to create this comment ");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, message: "Comment created" });
    };
    freezeComment = async (req, res) => {
        const { commentId } = req.params || {};
        console.log({ commentId });
        const findComment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
            },
            options: {
                populate: [{ path: "postId", select: "createdBy" }]
            }
        });
        const isCommentOwner = findComment?.createdBy?.toString() === req.user?._id?.toString();
        const isPostOwner = findComment?.postId?.createdBy?.toString() === req.user?._id?.toString();
        const isAdmin = req.user?.role === model_1.RoleEnum.admin;
        if (!(isCommentOwner || isPostOwner || isAdmin)) {
            throw new error_response_1.ForbiddenException("Not authorized user or post already deleted");
        }
        await this.commentModel.updateOne({
            filter: {
                _id: commentId,
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1
                }
            }
        });
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    hardDeletedComment = async (req, res) => {
        const { commentId } = req.params || {};
        console.log({ commentId });
        const comment = await this.commentModel.findOneAndDelete({
            filter: {
                _id: commentId,
                freezedAt: { $exists: true },
            },
            options: {
                populate: [{ path: "postId", select: "createdBy" }]
            }
        });
        const isCommentOwner = comment?.createdBy?.toString() === req.user?._id?.toString();
        const isPostOwner = comment?.postId?.createdBy?.toString() === req.user?._id?.toString();
        const isAdmin = req.user?.role === model_1.RoleEnum.admin;
        if (!(isCommentOwner || isPostOwner || isAdmin)) {
            throw new error_response_1.ForbiddenException("Not authorized user or post already deleted");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    updateComment = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
            },
            options: {
                populate: [{ path: "postId", select: "assetsFolderId" }]
            }
        });
        if (!comment) {
            throw new error_response_1.NotFoundException("failed to find matching result");
        }
        ;
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        if (req.files?.length) {
            const postAttachments = comment.postId;
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${comment.createdBy}/post/${postAttachments}`
            });
        }
        ;
        const updateComment = await this.commentModel.updateOne({
            filter: { _id: comment._id },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: ["$attachments", req.body.removedAttachments || []]
                                },
                                attachments
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: ["$tags", (req.body.removedTags || []).map((tag) => {
                                            return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                        })]
                                },
                                (req.body.tags || []).map((tag) => {
                                    return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                })
                            ]
                        },
                    }
                }
            ]
        });
        if (!updateComment.matchedCount) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to update this comment ");
        }
        else {
            if (req.body.removedAttachments?.length) {
                await (0, s3_config_1.deleteFiles)({ urls: req.body.removedAttachments });
            }
        }
        if (req.body.tags?.length) {
            const taggedUser = await this.userModel.find({
                filter: { _id: { $in: req.body.tags } }
            });
            const postLink = `${process.env.SOCIAL_APP_LINK}/post/${commentId}`;
            taggedUser.map(user => {
                email_event_1.emailEvent.emit("send-tag-mentioned", {
                    to: user.email,
                    postLink
                });
            });
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, message: "Comment updated" });
    };
    getCommentById = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: { _id: commentId },
        });
        if (!comment) {
            throw new error_response_1.NotFoundException("Comment not found");
        }
        return (0, success_response_1.successResponse)({
            res,
            message: "Comment with reply",
            data: { comment }
        });
    };
    getCommentWithReply = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: { _id: commentId },
            options: {
                populate: [{
                        path: "reply",
                        match: {
                            commentId: { $exists: true },
                            freezedAt: { $exists: false }
                        }
                    }]
            }
        });
        if (!comment) {
            throw new error_response_1.NotFoundException("Comment not found");
        }
        return (0, success_response_1.successResponse)({
            res,
            message: "user Comment",
            data: { comment }
        });
    };
}
exports.default = new CommentServices();
