"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareHash = exports.generateHash = void 0;
const bcrypt_1 = require("bcrypt");
const generateHash = async (plainText, saltRound = Number(process.env.SALT_ROUND)) => {
    return await (0, bcrypt_1.hash)(plainText, saltRound);
};
exports.generateHash = generateHash;
const compareHash = async (plainText, hash) => {
    return await (0, bcrypt_1.compare)(plainText, hash);
};
exports.compareHash = compareHash;
