"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
const send_email_1 = require("./send.email");
const verify_templet_email_1 = require("./verify.templet.email");
exports.emailEvent = new node_events_1.EventEmitter();
exports.emailEvent.on("confirmEmail", async (data) => {
    try {
        data.subject = "confirm-Email";
        data.html = (0, verify_templet_email_1.verifyEmail)({ otp: data.otp, title: "confirm-Email" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
exports.emailEvent.on("sendForgetCode", async (data) => {
    try {
        data.subject = "reset-Password";
        data.html = (0, verify_templet_email_1.verifyEmail)({ otp: data.otp, title: "reset-Password" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
exports.emailEvent.on("updateEmail", async (data) => {
    try {
        data.subject = "reset-Password";
        data.html = (0, verify_templet_email_1.verifyEmail)({ otp: data.otp, title: "reset-Password" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
exports.emailEvent.on("2-step-verification-otp", async (data) => {
    try {
        data.subject = "2-step-verification-otp";
        data.html = (0, verify_templet_email_1.verifyEmail)({ otp: data.otp, title: "2-step-verification-otp" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
exports.emailEvent.on("verification-code", async (data) => {
    try {
        data.subject = "verification-code";
        data.html = (0, verify_templet_email_1.verifyEmail)({ otp: data.otp, title: "verification-code" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
exports.emailEvent.on("send-tag-mentioned", async (data) => {
    try {
        data.subject = "some one tagged you on a post";
        data.html = (0, verify_templet_email_1.verifyEmail)({ postLink: data.postLink, title: "Your friend mention you in a post" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log(`Fail to send email`, error);
    }
});
