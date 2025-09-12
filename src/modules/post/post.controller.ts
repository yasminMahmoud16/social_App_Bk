import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import postServices from "./post.services";
import { cloudMulter, fileValidation } from "../../utils/multer/cloud.multer";
import * as validators from "./post.validation"
import { validation } from "../../middleware/validation.middleware";
const router:Router = Router();

router.post(
  '/',
  authentication(),
    cloudMulter({ validation: fileValidation.image }).array("attachments", 2), 
  validation(validators.createPost),
  postServices.createPost
);
router.patch(
  '/:postId/like',
  authentication(),
    // cloudMulter({ validation: fileValidation.image }).array("attachments", 2), 
  validation(validators.likePost),
  postServices.likePost
);


router.get('/:postId',postServices.sharePost);


export default router