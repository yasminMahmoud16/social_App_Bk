"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../Db/repository");
const post_model_1 = require("../../Db/model/post.model");
const User_model_1 = require("../../Db/model/User.model");
const error_response_1 = require("../../utils/response/error.response");
const uuid_1 = require("uuid");
const s3_config_1 = require("../../utils/multer/s3.config");
class PostServices {
    postModel = new repository_1.PostRepository(post_model_1.PostModel);
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    createPost = async (req, res) => {
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } })).length
                !== req.body.tags?.length) {
            throw new error_response_1.NotFoundException("user you mentioned are not exist ");
        }
        let attachments = [];
        let assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
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
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let update = { $addToSet: { likes: req.user?._id } };
        if (action === post_model_1.ActionsEnum.unLike) {
            update = { $pull: { likes: req.user?._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: { _id: postId },
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
}
exports.default = new PostServices();
