
import type { Request, Response } from "express"
import { successResponse } from "../../utils/response/success.response";
import { PostRepository, UserRepository } from "../../Db/repository";
import { ActionsEnum, HPostDocument, PostModel } from "../../Db/model/post.model";
import { UserModel } from "../../Db/model/User.model";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response";
import {v4 as uuid} from "uuid"
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { ILikePostQueryDto } from "./post.dto";
import { UpdateQuery } from "mongoose";


class PostServices {
    private postModel = new PostRepository(PostModel)
    private userModel = new UserRepository(UserModel)
    constructor() { }



    createPost = async (req: Request, res: Response): Promise<Response> => {
        // tags - attachments -content-allow comment - availability
        // tags 

        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } })).length
            !== req.body.tags?.length
        ) {
            throw new NotFoundException("user you mentioned are not exist ")
        }

        // attachments 
        let attachments: string[] = [];
        let assetsFolderId: string = uuid();
        if (req.files?.length) {
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path:`users/${req.user?._id}/post/${assetsFolderId}`
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
                await deleteFiles({urls:attachments})
            }
            throw new BadRequestException("failed to create this post ")
        }
        
        return successResponse({ res, statusCode: 201, message:"Post created" })
    };
    likePost = async (req: Request, res: Response): Promise<Response> => {
        // postId - userId

        // postId 

        const { postId } = req.params as { postId: string };
        const { action } = req.query as ILikePostQueryDto
        let update:UpdateQuery<HPostDocument> = { $addToSet: { likes: req.user?._id } };
        if (action === ActionsEnum.unLike) {
            update= {$pull: {likes:req.user?._id}}
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: { _id: postId },
            update
        });
        if (!post) {
            throw new NotFoundException("In-valid post id or post not exist ")
        }


        return successResponse({ res})
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
            data:{post}

        });

    };




}

export default new PostServices()