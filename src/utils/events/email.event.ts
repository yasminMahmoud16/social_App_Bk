import { EventEmitter } from "node:events";
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "../email/send.email";
import { verifyEmail } from "../email/verify.templet.email";

interface IEmail extends Mail.Options{
    otp:number,
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