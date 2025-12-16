"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeletePost = exports.sharePost = exports.freezePost = exports.likePost = exports.updatePost = exports.createPost = void 0;
const zod_1 = require("zod");
const post_model_1 = require("../../Db/model/post.model");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const mongoose_1 = require("mongoose");
exports.createPost = {
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generalFields.files(cloud_multer_1.fileValidation.image)).max(2).optional(),
        allowComments: zod_1.z.enum(post_model_1.AllowCommentsEnum).default(post_model_1.AllowCommentsEnum.allow),
        availability: zod_1.z.enum(post_model_1.AvailabilityEnum).default(post_model_1.AvailabilityEnum.public),
        tags: zod_1.z.array(validation_middleware_1.generalFields.id).max(10).optional(),
    }).superRefine((data, ctx) => {
        if (!data.attachments?.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Sorry we can not make post without content or attachment "
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users"
            });
        }
    })
};
exports.updatePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
        allowComments: zod_1.z.enum(post_model_1.AllowCommentsEnum).optional(),
        availability: zod_1.z.enum(post_model_1.AvailabilityEnum).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generalFields.files(cloud_multer_1.fileValidation.image)).max(2).optional(),
        removedAttachments: zod_1.z.array(zod_1.z.string()).max(2).optional(),
        tags: zod_1.z.array(validation_middleware_1.generalFields.id).max(10).optional(),
        removedTags: zod_1.z.array(validation_middleware_1.generalFields.id).max(10).optional(),
    }).superRefine((data, ctx) => {
        if (!Object.values(data)?.length) {
            ctx.addIssue({
                code: "custom",
                message: "All fields are empty "
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users"
            });
        }
        if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["removedTags"],
                message: "Duplicated removed tagged users"
            });
        }
    })
};
exports.likePost = {
    params: exports.updatePost.params,
    query: zod_1.z.strictObject({
        action: zod_1.z.enum(post_model_1.ActionsEnum).default(post_model_1.ActionsEnum.like)
    })
};
exports.freezePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id
    }).optional().refine((data) => {
        return data?.postId ? mongoose_1.Types.ObjectId.isValid(data.postId) : true;
    }, {
        error: "In-valid object formate",
        path: ['postId']
    }),
};
exports.sharePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id
    })
};
exports.hardDeletePost = exports.freezePost;
