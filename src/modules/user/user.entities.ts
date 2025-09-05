import { HUserDocument } from "../../Db/model/User.model"

export interface IProfileImageResponse {
    url:string
}
export interface IUserResponse {
    user:  Partial<HUserDocument>
}