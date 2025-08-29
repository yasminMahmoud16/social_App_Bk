import { Router } from "express";
import authService from "./auth.services";
import * as validators from "./auth.validation"
import { validation } from "../../middleware/validation.middleware";
const router:Router = Router();

router.post(
    '/signup',
    validation(validators.signup),
    authService.signup
)
router.patch(
    '/confirm-email',
    validation(validators.confirmEmail),
    authService.confirmEmail
)
router.post('/login', authService.login);
router.post('/signup-gmail',validation(validators.signupGmail),authService.signupGmail);
router.post('/login-gmail',validation(validators.signupGmail),authService.loginGmail);
router.patch('/send-forget-code',validation(validators.sendForgetCode),authService.sendForgetCode);
router.patch('/verify-forget-code',validation(validators.verifyForgetCode),authService.verifyForgetCode);
router.patch('/reset-forget-password',validation(validators.resetForgetPassword),authService.resetForgetPassword);

export default router