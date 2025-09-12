import {z} from "zod"
import { likePost } from "./post.validation"

export type ILikePostQueryDto = z.infer<typeof likePost.query>