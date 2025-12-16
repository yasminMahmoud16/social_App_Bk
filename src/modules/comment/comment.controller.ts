import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import commentServices from "./comment.services";
import { cloudMulter, fileValidation } from "../../utils/multer/cloud.multer";
import * as validators from "./comment.validation"
import { validation } from "../../middleware/validation.middleware";
const router: Router = Router({mergeParams:true});

router.post(
  '/',
  authentication(),
  cloudMulter({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.createComment),
  commentServices.createComment
);
router.post(
  '/:commentId/reply',
  authentication(),
  cloudMulter({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.replyOnComment),
  commentServices.replyOnComment
);


// delete
router.delete('/freeze-comment/:commentId', authentication(), validation(validators.freezeComment), commentServices.freezeComment);
router.delete('/hard-delete-comment/:commentId', authentication(), validation(validators.hardDeletedComment), commentServices.hardDeletedComment);

// update 
router.patch(
  '/:commentId',
  authentication(),
  cloudMulter({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.updateComment),
  commentServices.updateComment
);


// get comment 
router.get('/:commentId',validation(validators.getCommentById), commentServices.getCommentById);
router.get('/:commentId/comment-with-reply', validation(validators.getCommentWithReply), commentServices.getCommentWithReply);

export default router