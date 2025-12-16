import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import postServices from "./post.services";
import { cloudMulter, fileValidation } from "../../utils/multer/cloud.multer";
import * as validators from "./post.validation"
import { validation } from "../../middleware/validation.middleware";
import { commentRouter } from "../comment";
const router:Router = Router();
router.use("/:postId/comment", commentRouter)
router.post(
  '/',
  authentication(),
    cloudMulter({ validation: fileValidation.image }).array("attachments", 2), 
  validation(validators.createPost),
  postServices.createPost
);
router.patch(
  '/:postId',
  authentication(),
  cloudMulter({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.updatePost),
  postServices.updatePost
);
router.get(
  '/',
  authentication(),

  postServices.postList
);
router.patch(
  '/:postId/like',
  authentication(),
    // cloudMulter({ validation: fileValidation.image }).array("attachments", 2), 
  validation(validators.likePost),
  postServices.likePost
);


router.get('/:postId', validation(validators.sharePost), postServices.sharePost);
// delete
router.delete('/freeze-post/:postId', authentication(), validation(validators.freezePost), postServices.freezePost);
router.delete('/:postId/hard-delete-post', authentication(), validation(validators.hardDeletePost), postServices.hardDeletePost);
export default router