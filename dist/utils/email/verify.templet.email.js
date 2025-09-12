"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = void 0;
const verifyEmail = ({ title, postLink, otp, }) => {
    return ` 
        <h2 style="color:#333;text-align:center;">${title} 📧</h2>
    
    
        <p style="font-size:16px;color:#555; text-align:center">
          ${otp || postLink}
        </p>
        <div style="margin:30px 0;text-align:center;">
         
        </div>
        <p style="font-size:14px;color:#999;text-align:center;">
          If you did not sign up for this, please ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="font-size:12px;color:#aaa;text-align:center;">
          &copy; 2025 social app. All rights reserved.
        </p>
      </>`;
};
exports.verifyEmail = verifyEmail;
