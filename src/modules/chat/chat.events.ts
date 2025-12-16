import { Server } from "socket.io";
import { IAuthSocket } from "../gateway/gateway.interface";
import { ChatServices } from "./chat.services";


export class ChatEvents {
    private chatServices: ChatServices = new ChatServices()
    constructor() { }


    sayHi = (socket: IAuthSocket, io: Server) => {
        return socket.on("sayHi", (message: string, callback) => {
            this.chatServices.sayHi({ message, socket, callback, io })
        })
    }
    sendMessage = (socket: IAuthSocket, io: Server) => {
        return socket.on("sendMessage", (data: {
            content: string, sendTo: string
        }) => {
            this.chatServices.sendMessage({ ...data, socket, io })
        })
    }
}