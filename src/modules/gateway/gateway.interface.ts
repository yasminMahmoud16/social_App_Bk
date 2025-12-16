import { JwtPayload } from "jsonwebtoken"
import { HUserDocument } from "../../Db/model"
import { Socket } from "socket.io"

export interface IAuthSocket extends Socket{
    credentials?: {
        user: Partial<HUserDocument>,
        decoded:JwtPayload
        
    }
}