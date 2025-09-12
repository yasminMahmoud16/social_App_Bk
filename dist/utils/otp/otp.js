"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLoginOtp = exports.generateNumberOtp = void 0;
const generateNumberOtp = () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
};
exports.generateNumberOtp = generateNumberOtp;
const generateLoginOtp = () => {
    return Math.floor(Math.random() * 90 + 10);
};
exports.generateLoginOtp = generateLoginOtp;
