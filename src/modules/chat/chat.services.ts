// chat service to make the events call the db

import { Types } from "mongoose";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { IGetChatParamDto, ISayHiDto, ISendMessageDto } from "./chat.dto";
import { successResponse } from "../../utils/response/success.response";
import type{ Request, Response } from "express";
import { ChatRepository, UserRepository } from "../../Db/repository";
import { ChatModel, UserModel } from "../../Db/model";
import { IGetChatResponse } from "./chat.entities";
import { connectedSocket } from "../gateway";




export class ChatServices {
    private chatModel: ChatRepository = new ChatRepository(ChatModel);
    private userModel: UserRepository = new UserRepository(UserModel);
    constructor() { }

    // Rest Api
    getChat = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IGetChatParamDto;

        const chat = await this.chatModel.findOne({
            filter: {
                participants: {
                    $all: [
                        req.user?._id,
                        Types.ObjectId.createFromHexString(userId),
                    ],
                },
                group: { $exists: false },
            },
            options: {
                populate: [{ path:"participants", select:"firstName lastName email gender profilePicture"}]
            }
        });

        if (!chat) {
            throw new BadRequestException("Failed to find matching chat instance");
        }

        return successResponse < IGetChatResponse>({ res, data: { chat } });
    };

    // io
    sayHi = ({ message, socket, callback }: ISayHiDto) => {
        try {

            console.log({ message });
            throw new BadRequestException("errrrrorrrrrr")
            callback ? callback("Hello fromBE to FE") : undefined
        } catch (error) {
            socket.emit("custom_error", error)
        }
    }
    sendMessage =async ({ content, sendTo, socket,io }: ISendMessageDto) => {
        try {
            const createdBy = socket.credentials?.user._id as Types.ObjectId
            console.log({ content, sendTo, createdBy });
            // check if user from the friends
            const user = await this.userModel.findOne({
                filter: {
                    _id: Types.ObjectId.createFromHexString(sendTo),
                    friends: { $in: createdBy }
                }
            });

            if (!user) {
                throw new NotFoundException("in-valid recipient friend");
            }
            
                // create chat 
            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    participants: {
                        $all: [
                            createdBy,
                            Types.ObjectId.createFromHexString(sendTo),
                        ],
                    },
                },
                update: {
                    $addToSet: { messages: { content, createdBy } }
                }
            });
            if (!chat) {
                const [newChat] = await this.chatModel.create({
                    data: [{
                        createdBy,
                        messages: [{ content, createdBy }],
                        participants: [
                            createdBy,
                            Types.ObjectId.createFromHexString(sendTo),
                        ]
                    }]
                }) || [];
                if (!newChat) {
                    throw new BadRequestException("failed to create this chat ");
                }
            } 
            
console.log({u:connectedSocket.get(createdBy.toString() as string)});

            io?.to(connectedSocket.get(createdBy.toString() as string) as string[]).emit("onSuccessMessage", { content ,createdBy});
        } catch (error) {
            socket.emit("custom_error", error)
        }
    }



};
