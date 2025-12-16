import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./chat.validation"
import { ChatServices } from "./chat.services";
const router = Router({ mergeParams: true });
const chatServices:ChatServices= new ChatServices()


router.get("/", authentication(), validation(validators.getChat), chatServices.getChat)
export default router