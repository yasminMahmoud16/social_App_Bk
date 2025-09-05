import { Router } from "express";
import userServices from "./user.services";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators  from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import { cloudMulter, fileValidation, StorageEnum } from "../../utils/multer/cloud.multer";
import { endPoints } from "./user.authorization";

const router = Router();

router.get('/',authentication(),userServices.profile);
router.patch('/profile-image',
    authentication(),
    // cloudMulter({validation:fileValidation.image ,storageApproach:StorageEnum.disk}).single("image"),
    userServices.profileImage);
router.patch('/profile-cover-images',
    authentication(),
    cloudMulter({validation:fileValidation.image ,storageApproach:StorageEnum.memory}).array("image",2),
    userServices.profileCoverImages);
router.get('/:userId/profile',userServices.shareProfile);
router.post('/logout',authentication(),validation(validators.logout),userServices.logout);
router.post('/refresh-token', authentication(TokenEnum.refresh), userServices.refreshToken);



router.patch('/update-password',authentication(),validation(validators.updatePassword),userServices.updatePassword);
router.patch('/update-email',authentication(),validation(validators.updateEmail),userServices.updateEmail);
router.patch('/confirm-update-email',authentication(),validation(validators.confirmUpdateEmail),userServices.confirmUpdatedEmail);
// delete 
router.delete('{/:userId}/freeze-account',authentication(),validation(validators.freezeAccount),userServices.freezeAccount);
router.patch('/:userId/restore-account',authorization(endPoints.restore),validation(validators.restoreAccount),userServices.restoreAccount);
router.delete('/:userId/hard-delete-account',authorization(endPoints.hardDelete),validation(validators.hardDeleteAccount),userServices.hardDeleteAccount);
export default router;