"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const chat_events_1 = require("./chat.events");
class ChatGateway {
    chatEvents = new chat_events_1.ChatEvents();
    constructor() { }
    register = (socket, io) => {
        this.chatEvents.sayHi(socket, io);
        this.chatEvents.sendMessage(socket, io);
    };
}
exports.ChatGateway = ChatGateway;
