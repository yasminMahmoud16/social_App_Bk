import{Server as HttpsServer} from "node:http"

// io 
import { Server } from "socket.io"
import { decodedToken, TokenEnum } from "../../utils/security/token.security";
import { IAuthSocket } from "./gateway.interface";
import { ChatGateway } from "../chat";
import { BadRequestException } from "../../utils/response/error.response";




// get userId with socketId Map (key, value
export const connectedSocket = new Map<string, string[]>();

let io: undefined | Server = undefined

export const initializeIo = (httpsServer: HttpsServer) => {

    // init io
    io = new Server(httpsServer, {
        cors: {
            origin: "*"
        }
    });

    // handle middleware
    io.use(async (socket: IAuthSocket, next) => {
        // console.log(socket.handshake.auth.authorization);
        try {
            const { user, decoded } = await decodedToken({
                authorization: socket.handshake?.auth.authorization || "",
                tokenType: TokenEnum.access
            })
            const userTabs = connectedSocket.get(user._id.toString()) || [];
            userTabs.push(socket.id)
            connectedSocket.set(user._id.toString(), userTabs)
            socket.credentials = { user, decoded }
            next()
        } catch (error: any) {
            next(error)
        }
    })


    // disconnection 
    function disconnection(socket: IAuthSocket) {
        socket.on("disconnect", () => {
            const userId = socket.credentials?.user._id?.toString() as string;
            const remainingTabs = connectedSocket.get(userId)?.filter((tab: string) => {
                return tab !== socket.id
            }) || [];
            if (remainingTabs?.length) {
                connectedSocket.set(userId, remainingTabs)
            } else {

                connectedSocket.delete(socket.credentials?.user._id?.toString() as string);
                getIo().emit("offlineUser", userId);
            }
            console.log(`logout from ::: ${socket.id}`);
            console.log({ afterDisConnected: connectedSocket });

        });
    }
    // listen to connection
    const chatGateway: ChatGateway = new ChatGateway()
    io.on("connection", (socket: IAuthSocket) => {
        chatGateway.register(socket, getIo())
        disconnection(socket)

    })
};


// global method for io

export const getIo = () => {
    if (!io) {
        throw new BadRequestException("faild to establish server socket io")
    }

    return io;
}