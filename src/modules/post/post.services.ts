
import type { Request, Response } from "express"
import { successResponse } from "../../utils/response/success.response";
import { CommentRepository, PostRepository, UserRepository } from "../../Db/repository";
import { ActionsEnum, AvailabilityEnum, HPostDocument, PostModel } from "../../Db/model/post.model";
import { RoleEnum, UserModel } from "../../Db/model/User.model";
import { BadRequestException, ForbiddenException, NotFoundException } from "../../utils/response/error.response";
import { v4 as uuid } from "uuid"
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { IFreezePostDto, ILikePostQueryDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import { emailEvent } from "../../utils/email/email.event";
import { CommentModel } from "../../Db/model";
import { strict } from "assert";



export const postAvailability = (req: Request) => {
    return [
        { availability: AvailabilityEnum.public },
        { availability: AvailabilityEnum.onlyMe, createdBy: req.user?._id },
        {
            availability: AvailabilityEnum.friends,
            createdBy: { $in: [...(req.user?.friends || []), req.user?._id] }

        },
        {
            availability: { $ne: AvailabilityEnum.onlyMe },
            tags: { $in: req.user?._id }
        }
    ]
}
class PostServices {
    private postModel = new PostRepository(PostModel);
    private commentModel = new CommentRepository(CommentModel);
    private userModel = new UserRepository(UserModel);
    constructor() { }



    createPost = async (req: Request, res: Response): Promise<Response> => {
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
        let assetsFolderId: string = uuid();
        if (req.files?.length) {
            attachments = await uploadFiles({
                storageApproach: StorageEnum.memory,
                files: req.files as Express.Multer.File[],
                path: `users/${req.user?._id}/post/${assetsFolderId}`
            })
        };
        // add in DB 
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
                await deleteFiles({ urls: attachments })
            }
            throw new BadRequestException("failed to create this post ")
        }

        return successResponse({ res, statusCode: 201, message: "Post created" })
    };
    updatePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id
            }
        });

        // console.log({post});
        // console.log({ postId });
        // console.log(postId== post?._id);

        if (!post) {
            throw new NotFoundException("failed to find this post ")
        }

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
                files: req.files as Express.Multer.File[],
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`
            })
        };

        const updatePost = await this.postModel.updateOne({
            filter: { _id: post._id },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
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
        })


        if (!updatePost.matchedCount) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments })
            }
            throw new BadRequestException("failed to create this post ")
        } else {
            if (req.body.removedAttachments?.length) {
                await deleteFiles({ urls: req.body.removedAttachments })
            }
        }
if (req.body.tags?.length) {
            const taggedUser = await this.userModel.find({
                filter: { _id: { $in: req.body.tags } }
            });

    const postLink = `${process.env.SOCIAL_APP_LINK}/post/${postId}`;
            taggedUser.map(user => {
                
    
                emailEvent.emit("send-tag-mentioned", {
                    to: user.email,
                    postLink
                })
            })
        }
        return successResponse({ res, message: "Post updated" })
    };
    likePost = async (req: Request, res: Response): Promise<Response> => {
        // postId - userId

        // postId 

        const { postId } = req.params as { postId: string };
        const { action } = req.query as ILikePostQueryDto
        let update: UpdateQuery<HPostDocument> = { $addToSet: { likes: req.user?._id } };
        if (action === ActionsEnum.unLike) {
            update = { $pull: { likes: req.user?._id } }
        }



        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: postAvailability(req)
            },
            update
        });
        if (!post) {
            throw new NotFoundException("In-valid post id or post not exist ")
        }


        return successResponse({ res })
    };


    // get post by id 

    sharePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: { _id: postId },

        })

        if (!post) {
            throw new NotFoundException("Post not found")
        }

        return successResponse({
            res,
            message: "user post",
            data: { post }

        });

    };
    postList = async (req: Request, res: Response): Promise<Response> => {
        let { page, size } = req.query as unknown as { page: number, size: number };



        const posts = await this.postModel.paginate({
            filter: {
                $or: postAvailability(req)
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

        // const posts = await this.postModel.findCursor({
        //     filter: {
        //             $or: postAvailability(req)
        //         },
        // })



        return successResponse({
            res,
            message: "posts",
            data: { posts }

        });

    };

    freezePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = (req.params as IFreezePostDto) || {};
        console.log({ postId });

        const findPost = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id
            },
        });
        console.log({ findPost });
        if (!findPost && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException("Not authorized user or post already deleted")
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


        // find => get all comments
        const comments = await this.commentModel.find({
            filter:{postId}
        })

        console.log({ comments });

        for (const comment of comments) {
            await this.commentModel.updateOne({
                filter: {
                    postId,
                    _id: comment._id,
                    freezedAt:{$exists:false}
                },
                update: {
                    freezedAt: new Date(),
                    freezedBy:req.user?._id
                }
            })
        }

        




        return successResponse({
            res,
        });
    };
    hardDeletePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = (req.params as IFreezePostDto) || {};
        console.log({ postId });



        const post = await this.postModel.deleteOne({
            filter: {
                _id: postId,
                freezedAt: { $exists: true },
                $or: [
                    { createdBy: req.user?._id },
                    ...(req.user?.role === RoleEnum.admin ? [{}] : [])
                ]

            },
        });

        console.log({ post });
        


        if (!post.deletedCount) {
            throw new NotFoundException("Post not found or failed to hard delete this resource")
        };
        const comments = await this.commentModel.find({
            filter: {
                postId,
                freezedAt: {
                    $exists: true
                },
                paranoid: false
            }
        })

        console.log({ commentsHardDel: comments });

        for (const comment of comments) {
            await this.commentModel.deleteOne({
                filter: {
                    postId,
                    _id: comment._id,
                    freezedAt: { $exists: true },
                    $or: [
                        { createdBy: req.user?._id },
                        ...(req.user?.role === RoleEnum.admin ? [{}] : [])
                    ]
                }
            })
        }
        return successResponse({
            res,
        });
    };





}

export default new PostServices()