import { Server } from "socket.io";
import { IAuthSocket } from "../gateway/gateway.interface";
import { ChatEvents } from "./chat.events";



export class ChatGateway{
    private chatEvents = new ChatEvents()
    constructor() { }
    

    // the place where the event register only
    register = (socket:IAuthSocket, io:Server) => {
        this.chatEvents.sayHi(socket, io)
        this.chatEvents.sendMessage(socket, io)
    }
}