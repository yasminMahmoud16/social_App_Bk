"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endPoints = void 0;
const User_model_1 = require("../../Db/model/User.model");
exports.endPoints = {
    profile: [
        User_model_1.RoleEnum.user,
        User_model_1.RoleEnum.admin
    ]
};
