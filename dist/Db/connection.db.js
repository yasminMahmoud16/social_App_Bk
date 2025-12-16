"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const mongoose_1 = require("mongoose");
const model_1 = require("./model");
const connectDb = async () => {
    try {
        const result = await (0, mongoose_1.connect)(process.env.DB_URI, {
            serverSelectionTimeoutMS: 30000
        });
        await model_1.UserModel.syncIndexes();
        (0, console_1.log)(result.models);
        (0, console_1.log)("DB Connected Successfully 🚀🚀");
    }
    catch (error) {
        (0, console_1.log)(`Failed To Connect Db ❌❌ `);
    }
};
exports.default = connectDb;
