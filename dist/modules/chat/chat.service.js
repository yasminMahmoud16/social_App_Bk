"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatServices = void 0;
const error_response_1 = require("../../utils/response/error.response");
class ChatServices {
    constructor() { }
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
}
exports.ChatServices = ChatServices;
