"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChat = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.getChat = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id
    }),
};
