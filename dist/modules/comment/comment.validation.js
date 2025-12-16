"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentWithReply = exports.getCommentById = exports.updateComment = exports.hardDeletedComment = exports.freezeComment = exports.replyOnComment = exports.createComment = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const mongoose_1 = require("mongoose");
exports.createComment = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generalFields.files(cloud_multer_1.fileValidation.image)).max(2).optional(),
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
exports.replyOnComment = {
    params: exports.createComment.params.extend({
        commentId: validation_middleware_1.generalFields.id
    }),
    body: exports.createComment.body
};
exports.freezeComment = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id,
        commentId: validation_middleware_1.generalFields.id
    }).optional().refine((data) => {
        return data?.commentId ? mongoose_1.Types.ObjectId.isValid(data.commentId) : true;
    }, {
        error: "In-valid object formate",
        path: ['commentId']
    }),
};
exports.hardDeletedComment = exports.freezeComment;
exports.updateComment = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id,
        commentId: validation_middleware_1.generalFields.id
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
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
exports.getCommentById = {
    params: zod_1.z.strictObject({
        commentId: validation_middleware_1.generalFields.id
    }),
};
exports.getCommentWithReply = exports.getCommentById;
