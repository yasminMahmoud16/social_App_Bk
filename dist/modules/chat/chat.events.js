"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvents = void 0;
const chat_services_1 = require("./chat.services");
class ChatEvents {
    chatServices = new chat_services_1.ChatServices();
    constructor() { }
    sayHi = (socket, io) => {
        return socket.on("sayHi", (message, callback) => {
            this.chatServices.sayHi({ message, socket, callback, io });
        });
    };
    sendMessage = (socket, io) => {
        return socket.on("sendMessage", (data) => {
            this.chatServices.sendMessage({ ...data, socket, io });
        });
    };
}
exports.ChatEvents = ChatEvents;
