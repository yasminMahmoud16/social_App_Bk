"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = exports.initializeIo = exports.connectedSocket = void 0;
const socket_io_1 = require("socket.io");
const token_security_1 = require("../../utils/security/token.security");
const chat_1 = require("../chat");
const error_response_1 = require("../../utils/response/error.response");
exports.connectedSocket = new Map();
let io = undefined;
const initializeIo = (httpsServer) => {
    io = new socket_io_1.Server(httpsServer, {
        cors: {
            origin: "*"
        }
    });
    io.use(async (socket, next) => {
        try {
            const { user, decoded } = await (0, token_security_1.decodedToken)({
                authorization: socket.handshake?.auth.authorization || "",
                tokenType: token_security_1.TokenEnum.access
            });
            const userTabs = exports.connectedSocket.get(user._id.toString()) || [];
            userTabs.push(socket.id);
            exports.connectedSocket.set(user._id.toString(), userTabs);
            socket.credentials = { user, decoded };
            next();
        }
        catch (error) {
            next(error);
        }
    });
    function disconnection(socket) {
        socket.on("disconnect", () => {
            const userId = socket.credentials?.user._id?.toString();
            const remainingTabs = exports.connectedSocket.get(userId)?.filter((tab) => {
                return tab !== socket.id;
            }) || [];
            if (remainingTabs?.length) {
                exports.connectedSocket.set(userId, remainingTabs);
            }
            else {
                exports.connectedSocket.delete(socket.credentials?.user._id?.toString());
                (0, exports.getIo)().emit("offlineUser", userId);
            }
            console.log(`logout from ::: ${socket.id}`);
            console.log({ afterDisConnected: exports.connectedSocket });
        });
    }
    const chatGateway = new chat_1.ChatGateway();
    io.on("connection", (socket) => {
        chatGateway.register(socket, (0, exports.getIo)());
        disconnection(socket);
    });
};
exports.initializeIo = initializeIo;
const getIo = () => {
    if (!io) {
        throw new error_response_1.BadRequestException("faild to establish server socket io");
    }
    return io;
};
exports.getIo = getIo;
