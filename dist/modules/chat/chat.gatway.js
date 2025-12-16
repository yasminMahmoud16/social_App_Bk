"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
class ChatGateway {
    constructor() { }
    register = (socket) => {
        socket.on("sayHi", (data, callBack) => {
            console.log({ data });
            callBack("Hello fromBE to FE");
        });
    };
}
exports.ChatGateway = ChatGateway;
