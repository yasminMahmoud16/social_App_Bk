"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenModel = void 0;
const mongoose_1 = require("mongoose");
;
const tokenSchema = new mongoose_1.Schema({
    jti: {
        type: String,
        required: true,
        unique: true,
    },
    expiriesIn: {
        type: Number,
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    }
});
exports.TokenModel = mongoose_1.models.Token || (0, mongoose_1.model)("Token", tokenSchema);
