import { Router } from "express";
import userServices from "./user.services";
import { authentication } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators  from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";

const router = Router();

router.get('/',authentication(),userServices.profile);
router.get('/:userId/profile',userServices.shareProfile);
router.post('/logout',authentication(),validation(validators.logout),userServices.logout);
router.post('/refresh-token', authentication(TokenEnum.refresh), userServices.refreshToken);
router.patch('/update-password',authentication(),validation(validators.updatePassword),userServices.updatePassword);
router.patch('/update-email',authentication(),validation(validators.updateEmail),userServices.updateEmail);
router.patch('/confirm-update-email',authentication(),validation(validators.confirmUpdateEmail),userServices.confirmUpdatedEmail);

export default router;