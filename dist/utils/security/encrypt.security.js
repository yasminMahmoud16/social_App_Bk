"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptEncryption = exports.generateEncryption = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const generateEncryption = async ({ plainText, secretKey = process.env.ENC_SECRET_KEY }) => {
    return crypto_js_1.default.AES.encrypt(plainText, secretKey).toString();
};
exports.generateEncryption = generateEncryption;
const decryptEncryption = async ({ ciphertext, secretKey = process.env.ENC_SECRET_KEY }) => {
    return crypto_js_1.default.AES.decrypt(ciphertext, secretKey).toString(crypto_js_1.default.enc.Utf8);
};
exports.decryptEncryption = decryptEncryption;
