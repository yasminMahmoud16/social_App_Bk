"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postAvailability = void 0;
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../Db/repository");
const post_model_1 = require("../../Db/model/post.model");
const User_model_1 = require("../../Db/model/User.model");
const error_response_1 = require("../../utils/response/error.response");
const uuid_1 = require("uuid");
const s3_config_1 = require("../../utils/multer/s3.config");
const mongoose_1 = require("mongoose");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const email_event_1 = require("../../utils/email/email.event");
const model_1 = require("../../Db/model");
const postAvailability = (req) => {
    return [
        { availability: post_model_1.AvailabilityEnum.public },
        { availability: post_model_1.AvailabilityEnum.onlyMe, createdBy: req.user?._id },
        {
            availability: post_model_1.AvailabilityEnum.friends,
            createdBy: { $in: [...(req.user?.friends || []), req.user?._id] }
        },
        {
            availability: { $ne: post_model_1.AvailabilityEnum.onlyMe },
            tags: { $in: req.user?._id }
        }
    ];
};
exports.postAvailability = postAvailability;
class PostServices {
    postModel = new repository_1.PostRepository(post_model_1.PostModel);
    commentModel = new repository_1.CommentRepository(model_1.CommentModel);
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    createPost = async (req, res) => {
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        let assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${req.user?._id}/post/${assetsFolderId}`
            });
        }
        ;
        const [post] = await this.postModel.create({
            data: [{
                    ...req.body,
                    attachments,
                    assetsFolderId,
                    createdBy: req.user?._id
                }]
        }) || [];
        if (!post) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to create this post ");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, message: "Post created" });
    };
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id
            }
        });
        if (!post) {
            throw new error_response_1.NotFoundException("failed to find this post ");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            });
        }
        ;
        const updatePost = await this.postModel.updateOne({
            filter: { _id: post._id },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
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
        if (!updatePost.matchedCount) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to create this post ");
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
            const postLink = `${process.env.SOCIAL_APP_LINK}/post/${postId}`;
            taggedUser.map(user => {
                email_event_1.emailEvent.emit("send-tag-mentioned", {
                    to: user.email,
                    postLink
                });
            });
        }
        return (0, success_response_1.successResponse)({ res, message: "Post updated" });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let update = { $addToSet: { likes: req.user?._id } };
        if (action === post_model_1.ActionsEnum.unLike) {
            update = { $pull: { likes: req.user?._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(req)
            },
            update
        });
        if (!post) {
            throw new error_response_1.NotFoundException("In-valid post id or post not exist ");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    sharePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: { _id: postId },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("Post not found");
        }
        return (0, success_response_1.successResponse)({
            res,
            message: "user post",
            data: { post }
        });
    };
    postList = async (req, res) => {
        let { page, size } = req.query;
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(req)
            },
            options: {
                populate: [{
                        path: "comments", match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [{
                                path: "reply", match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false },
                                },
                                populate: [{
                                        path: "reply", match: {
                                            commentId: { $exists: false },
                                            freezedAt: { $exists: false },
                                        },
                                    }]
                            }],
                    }]
            },
            page,
            size
        });
        console.log({ s: posts.length });
        console.log({ posts });
        return (0, success_response_1.successResponse)({
            res,
            message: "posts",
            data: { posts }
        });
    };
    freezePost = async (req, res) => {
        const { postId } = req.params || {};
        console.log({ postId });
        const findPost = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id
            },
        });
        console.log({ findPost });
        if (!findPost && req.user?.role !== User_model_1.RoleEnum.admin) {
            throw new error_response_1.ForbiddenException("Not authorized user or post already deleted");
        }
        await this.postModel.updateOne({
            filter: {
                _id: postId,
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1
                }
            },
        });
        const comments = await this.commentModel.find({
            filter: { postId }
        });
        console.log({ comments });
        for (const comment of comments) {
            await this.commentModel.updateOne({
                filter: {
                    postId,
                    _id: comment._id,
                    freezedAt: { $exists: false }
                },
                update: {
                    freezedAt: new Date(),
                    freezedBy: req.user?._id
                }
            });
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    hardDeletePost = async (req, res) => {
        const { postId } = req.params || {};
        console.log({ postId });
        const post = await this.postModel.deleteOne({
            filter: {
                _id: postId,
                freezedAt: { $exists: true },
                $or: [
                    { createdBy: req.user?._id },
                    ...(req.user?.role === User_model_1.RoleEnum.admin ? [{}] : [])
                ]
            },
        });
        console.log({ post });
        if (!post.deletedCount) {
            throw new error_response_1.NotFoundException("Post not found or failed to hard delete this resource");
        }
        ;
        const comments = await this.commentModel.find({
            filter: {
                postId,
                freezedAt: {
                    $exists: true
                },
                paranoid: false
            }
        });
        console.log({ commentsHardDel: comments });
        for (const comment of comments) {
            await this.commentModel.deleteOne({
                filter: {
                    postId,
                    _id: comment._id,
                    freezedAt: { $exists: true },
                    $or: [
                        { createdBy: req.user?._id },
                        ...(req.user?.role === User_model_1.RoleEnum.admin ? [{}] : [])
                    ]
                }
            });
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
}
exports.default = new PostServices();
