
import type { Request, Response } from "express"
import { successResponse } from "../../utils/response/success.response";
import { CommentRepository, PostRepository, UserRepository } from "../../Db/repository";
import { BadRequestException, ForbiddenException, NotFoundException } from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { AllowCommentsEnum, CommentModel, HCommentDocument, HPostDocument, PostModel, RoleEnum, UserModel } from "../../Db/model";
import { Types } from "mongoose";
import { postAvailability } from "../post/post.services";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import { IFreezeCommentDto } from "./comment.dto";
import { IPost } from "../../Db/model";
import { emailEvent } from "../../utils/email/email.event";



class CommentServices {
    private userModel = new UserRepository(UserModel)
    private postModel = new PostRepository(PostModel)
    private commentModel = new CommentRepository(CommentModel)
    constructor() { }



    createComment = async (req: Request, res: Response):
        Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        // check if you can write a comment on this post

        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                allowComments: AllowCommentsEnum.allow,
                $or: postAvailability(req)
            }
        });

        if (!post) {
            throw new NotFoundException("failed to find matching result")
        };


        // tags - attachments -content-allow comment - availability
        // tags 

        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
            !== req.body.tags?.length
        ) {
            throw new NotFoundException("user you mentioned are not exist ")
        }

        // attachments 
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await uploadFiles({
                storageApproach:StorageEnum.memory,
                files: req.files as Express.Multer.File[],
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            })
        };
        // add in DB 
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
                await deleteFiles({ urls: attachments })
            }
            throw new BadRequestException("failed to create this comment ")
        }

        return successResponse({ res, statusCode: 201, message: "Comment created" })
    };
    replyOnComment = async (req: Request, res: Response):
        Promise<Response> => {
        const { postId, commentId } = req.params as unknown as { postId: Types.ObjectId; commentId: Types.ObjectId };
        

        // check if you can write a comment on this post

        const comment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
                postId
            },
            // check allow comments on post 
            options: {
                populate: [{
                    path: "postId", match: {
                        allowComments: AllowCommentsEnum.allow,
                        $or: postAvailability(req)
                }}]
            }
        });

        console.log({comment});
        

        if (!comment?.postId) {
            throw new NotFoundException("failed to find matching result")
        };


        // tags - attachments -content-allow comment - availability
        // tags 

        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
            !== req.body.tags?.length
        ) {
            throw new NotFoundException("user you mentioned are not exist ")
        }

        // attachments 
        let attachments: string[] = [];
        if (req.files?.length) {
            const post = comment.postId as Partial<HPostDocument>
            attachments = await uploadFiles({
                storageApproach:StorageEnum.memory,
                files: req.files as Express.Multer.File[],
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            })
        };
        // add in DB 
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
                await deleteFiles({ urls: attachments })
            }
            throw new BadRequestException("failed to create this comment ")
        }

        return successResponse({ res, statusCode: 201, message: "Comment created" })
    };


        freezeComment = async (req: Request, res: Response): Promise<Response> => {
            const { commentId } = (req.params as IFreezeCommentDto) || {};
            console.log({ commentId });
    
            const findComment = await this.commentModel.findOne({
                filter: {
                    _id: commentId,
                    // createdBy: req.user?._id
                },
                options: {
                    populate: [{ path: "postId", select: "createdBy" }]
                    
                }
            })as Partial <HCommentDocument> &{postId:{createdBy:Types.ObjectId}}
            // console.log({ findComment });
            // console.log({ createdBy: findComment?.createdBy?.toString() });
            // console.log({ user: req.user?._id});
            // console.log({ condition: findComment?.createdBy?.toString() == req.user?._id.toString() });
            // console.log({ postOwner: findComment?.postId?.createdBy.toString() == req.user?._id.toString() });
            


            const isCommentOwner = findComment?.createdBy?.toString() === req.user?._id?.toString();
            const isPostOwner = findComment?.postId?.createdBy?.toString() === req.user?._id?.toString();
            const isAdmin = req.user?.role === RoleEnum.admin;

            if (!(isCommentOwner || isPostOwner || isAdmin)) {
                throw new ForbiddenException("Not authorized user or post already deleted");
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
            return successResponse({
                res,
            });
        };
        hardDeletedComment = async (req: Request, res: Response): Promise<Response> => {
            const { commentId } = (req.params as IFreezeCommentDto) || {};
            console.log({ commentId });
    
            const comment = await this.commentModel.findOneAndDelete({
                filter: {
                    _id: commentId,
                    freezedAt: { $exists: true },
                    // createdBy: req.user?._id
                },
                options: {
                    populate: [{ path: "postId", select: "createdBy" }]
                    
                }
            }) as Partial <HCommentDocument> &{postId:{createdBy:Types.ObjectId}}
            // console.log({ findComment });
            
            // console.log({ comment });
            // console.log({ createdBy: comment?.createdBy?.toString() });
            // console.log({ user: req.user?._id });
            // console.log({ condition: comment?.createdBy?.toString() == req.user?._id.toString() });
            

            const isCommentOwner = comment?.createdBy?.toString() === req.user?._id?.toString();
            const isPostOwner = comment?.postId?.createdBy?.toString() === req.user?._id?.toString();
            const isAdmin = req.user?.role === RoleEnum.admin;

            if (!(isCommentOwner || isPostOwner || isAdmin)) {
                throw new ForbiddenException("Not authorized user or post already deleted");
            }
            return successResponse({
                res,
            });
    };
    


    
    
    updateComment = async (req: Request, res: Response):
        Promise<Response> => {
        const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
        // check if you can write a comment on this post

        const comment  = await this.commentModel.findOne({
            filter: {
                _id: commentId,
            },
            options: {
                populate: [{ path: "postId", select:"assetsFolderId" }]
            }
        });

        if (!comment) {
            throw new NotFoundException("failed to find matching result")
        };


        // tags - attachments -content-allow comment - availability
        // tags 

        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length
            !== req.body.tags?.length
        ) {
            throw new NotFoundException("user you mentioned are not exist ")
        }

        // attachments 
        let attachments: string[] = [];
        if (req.files?.length) {
            const postAttachments = comment.postId as unknown as { assetsFolderId: string };

            attachments = await uploadFiles({
                storageApproach: StorageEnum.memory,
                files: req.files as Express.Multer.File[],
                path: `users/${comment.createdBy}/post/${postAttachments}`
            })
        };
        // add in DB 
        const updateComment = await this.commentModel.updateOne({
            filter: { _id: comment._id },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        attachments: {
                            $setUnion: [ //two stage one for remove then one for add 
                                {
                                    // show the attachments in DB - the removedAttach / remove 
                                    $setDifference: ["$attachments", req.body.removedAttachments || []]
                                },
                                //push the new one 
                                attachments
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    // show the tags in DB - the removedAttach
                                    $setDifference: ["$tags", (req.body.removedTags || []).map((tag: string) => {
                                        return Types.ObjectId.createFromHexString(tag);
                                    })]
                                },
                                //push the new one 
                                (req.body.tags || []).map((tag: string) => {
                                    return Types.ObjectId.createFromHexString(tag);
                                })
                            ]
                        },
                    }
                }
            ]
            
        }) ;

        if (!updateComment.matchedCount) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments })
            }
            throw new BadRequestException("failed to update this comment ")
        }else {
                    if (req.body.removedAttachments?.length) {
                        await deleteFiles({ urls: req.body.removedAttachments })
                    }
        }
        
        if (req.body.tags?.length) {
            const taggedUser = await this.userModel.find({
                filter: { _id: { $in: req.body.tags } }
            });

            const postLink = `${process.env.SOCIAL_APP_LINK}/post/${commentId}`;
            taggedUser.map(user => {
                
    
                emailEvent.emit("send-tag-mentioned", {
                    to: user.email,
                    postLink
                })
            })
        }

        return successResponse({ res, statusCode: 201, message: "Comment updated" })
    };



    getCommentById = async (req: Request, res: Response): Promise<Response> => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: { _id: commentId },
            

        })

        if (!comment) {
            throw new NotFoundException("Comment not found")
        }

        return successResponse({
            res,
            message: "Comment with reply",
            data: { comment }

        });

    };
    getCommentWithReply = async (req: Request, res: Response): Promise<Response> => {
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

        })

        if (!comment) {
            throw new NotFoundException("Comment not found")
        }

        return successResponse({
            res,
            message: "user Comment",
            data: { comment }

        });

    };


}

export default new CommentServices()