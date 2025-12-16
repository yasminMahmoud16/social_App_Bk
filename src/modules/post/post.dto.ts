import {z} from "zod"
import { freezePost, likePost } from "./post.validation"
export type ILikePostQueryDto = z.infer<typeof likePost.query>
 export type IFreezePostDto= z.infer<typeof freezePost.params >
