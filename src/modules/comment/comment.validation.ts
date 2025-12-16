import { z } from "zod"
import { ActionsEnum, AllowCommentsEnum, AvailabilityEnum } from "../../Db/model/post.model"
import { generalFields } from "../../middleware/validation.middleware"
import { fileValidation } from "../../utils/multer/cloud.multer"
import { Types } from "mongoose";



export const createComment = {
    params: z.strictObject({
        postId: generalFields.id
    }),
    body: z.strictObject({
        content: z.string().min(2).max(500000).optional(),
        attachments: z.array(generalFields.files(fileValidation.image)).max(2).optional(),

        tags: z.array(generalFields.id).max(10).optional(),



    }).superRefine((data, ctx) => {
        if (!data.attachments?.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Sorry we can not make post without content or attachment "
            })
        }

        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users"
            })
        }
    })
};


export const replyOnComment = {
    params: createComment.params.extend({
        commentId: generalFields.id
    }),
    body: createComment.body
}
// export const updatePost = {
//     params: z.strictObject({
//         postId: generalFields.id
//     }),
//     body: z.strictObject({
//         content: z.string().min(2).max(500000).optional(),
//         allowComments: z.enum(AllowCommentsEnum).optional(),
//         availability: z.enum(AvailabilityEnum).optional(),
//         attachments: z.array(generalFields.files(fileValidation.image)).max(2).optional(),
//         removedAttachments: z.array(z.string()).max(2).optional(),
//         tags: z.array(generalFields.id).max(10).optional(),
//         removedTags: z.array(generalFields.id).max(10).optional(),



//     }).superRefine((data, ctx) => {
//         if (!Object.values(data)?.length) {
//             ctx.addIssue({
//                 code: "custom",
//                 message: "All fields are empty "
//             })
//         }

//         if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
//             ctx.addIssue({
//                 code: "custom",
//                 path: ["tags"],
//                 message: "Duplicated tagged users"
//             })
//         }
//         if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
//             ctx.addIssue({
//                 code: "custom",
//                 path: ["removedTags"],
//                 message: "Duplicated removed tagged users"
//             })
//         }
//     })
// };


// export const likePost = {
//     params: updatePost.params,
//     query: z.strictObject({
//         action: z.enum(ActionsEnum).default(ActionsEnum.like)
//     })
// }

export const freezeComment = {
    params: z.strictObject(
        {
            postId: generalFields.id,
            commentId: generalFields.id
        }
    ).optional().refine((data) => {
        return data?.commentId ? Types.ObjectId.isValid(data.commentId) : true
    }, {
        error: "In-valid object formate",
        path: ['commentId']
    }),
} 

export const hardDeletedComment = freezeComment


export const updateComment = {
    params: z.strictObject({
        postId:generalFields.id,
        commentId:generalFields.id
    }),
    body: z.strictObject({
        content: z.string().min(2).max(500000).optional(),
        attachments: z.array(generalFields.files(fileValidation.image)).max(2).optional(),
        removedAttachments: z.array(z.string()).max(2).optional(),
        tags: z.array(generalFields.id).max(10).optional(),
        removedTags: z.array(generalFields.id).max(10).optional(),
        
        

    }).superRefine((data, ctx) => {
        if (!Object.values(data)?.length) {
            ctx.addIssue({
                code: "custom",
                message: "All fields are empty "
            })
        }

        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users"
            })
        }
        if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["removedTags"],
                message: "Duplicated removed tagged users"
            })
        }
    })
};


export const getCommentById = {
  params: z.strictObject({
    commentId: generalFields.id
  }),

}
export const getCommentWithReply= getCommentById 