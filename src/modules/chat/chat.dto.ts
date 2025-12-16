import { Server } from "socket.io";
import { IAuthSocket } from "../gateway/gateway.interface";

import {z} from "zod"
import { getChat } from "./chat.validation";

export type IGetChatParamDto=z.infer<typeof getChat.params>

export interface IMainDto {
    socket: IAuthSocket;
    callback?: any;
    io?:Server

}
export interface ISayHiDto extends IMainDto{
    message: string;
}
export interface ISendMessageDto extends IMainDto{
    content: string;
    sendTo:string
}