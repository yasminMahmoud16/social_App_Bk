import { RoleEnum } from "../../Db/model/User.model";

export const endPoints = {
    profile: [
        RoleEnum.user,
        RoleEnum.admin
    ]
}