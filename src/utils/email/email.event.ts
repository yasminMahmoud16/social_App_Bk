import { EventEmitter } from "node:events";
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "./send.email";
import { verifyEmail } from "./verify.templet.email";

interface IEmail extends Mail.Options{
    otp:number,
}
interface ITag extends Mail.Options{
    postLink:string,
}
export const emailEvent = new EventEmitter();
emailEvent.on("confirmEmail", async (data: IEmail) => {
    try {
        data.subject = "confirm-Email"
        data.html = verifyEmail({ otp: data.otp, title: "confirm-Email" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});
emailEvent.on("sendForgetCode", async (data: IEmail) => {
    try {
        data.subject = "reset-Password"
        data.html = verifyEmail({ otp: data.otp, title: "reset-Password" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});
emailEvent.on("updateEmail", async (data: IEmail) => {
    try {
        data.subject = "reset-Password"
        data.html = verifyEmail({ otp: data.otp, title: "reset-Password" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});
emailEvent.on("2-step-verification-otp", async (data: IEmail) => {
    try {
        data.subject = "2-step-verification-otp"
        data.html = verifyEmail({ otp: data.otp, title: "2-step-verification-otp" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});
emailEvent.on("verification-code", async (data: IEmail) => {
    try {
        data.subject = "verification-code"
        data.html = verifyEmail({ otp: data.otp, title: "verification-code" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});
emailEvent.on("send-tag-mentioned", async (data: ITag) => {
    try {
        data.subject = "some one tagged you on a post"
        data.html = verifyEmail({ postLink: data.postLink, title: "Your friend mention you in a post" })
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail to send email`, error);
        
    }
});