"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatServices = void 0;
const mongoose_1 = require("mongoose");
const error_response_1 = require("../../utils/response/error.response");
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../Db/repository");
const model_1 = require("../../Db/model");
const gateway_1 = require("../gateway");
class ChatServices {
    chatModel = new repository_1.ChatRepository(model_1.ChatModel);
    userModel = new repository_1.UserRepository(model_1.UserModel);
    constructor() { }
    getChat = async (req, res) => {
        const { userId } = req.params;
        const chat = await this.chatModel.findOne({
            filter: {
                participants: {
                    $all: [
                        req.user?._id,
                        mongoose_1.Types.ObjectId.createFromHexString(userId),
                    ],
                },
                group: { $exists: false },
            },
            options: {
                populate: [{ path: "participants", select: "firstName lastName email gender profilePicture" }]
            }
        });
        if (!chat) {
            throw new error_response_1.BadRequestException("Failed to find matching chat instance");
        }
        return (0, success_response_1.successResponse)({ res, data: { chat } });
    };
    sayHi = ({ message, socket, callback }) => {
        try {
            console.log({ message });
            throw new error_response_1.BadRequestException("errrrrorrrrrr");
            callback ? callback("Hello fromBE to FE") : undefined;
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
    sendMessage = async ({ content, sendTo, socket, io }) => {
        try {
            const createdBy = socket.credentials?.user._id;
            console.log({ content, sendTo, createdBy });
            const user = await this.userModel.findOne({
                filter: {
                    _id: mongoose_1.Types.ObjectId.createFromHexString(sendTo),
                    friends: { $in: createdBy }
                }
            });
            if (!user) {
                throw new error_response_1.NotFoundException("in-valid recipient friend");
            }
            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    participants: {
                        $all: [
                            createdBy,
                            mongoose_1.Types.ObjectId.createFromHexString(sendTo),
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
                                mongoose_1.Types.ObjectId.createFromHexString(sendTo),
                            ]
                        }]
                }) || [];
                if (!newChat) {
                    throw new error_response_1.BadRequestException("failed to create this chat ");
                }
            }
            console.log({ u: gateway_1.connectedSocket.get(createdBy.toString()) });
            io?.to(gateway_1.connectedSocket.get(createdBy.toString())).emit("onSuccessMessage", { content, createdBy });
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
}
exports.ChatServices = ChatServices;
;
