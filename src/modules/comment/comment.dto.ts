import { z } from "zod"
import { freezeComment } from "./comment.validation"

// export type ILikePostQueryDto = z.infer<typeof likePost.query>
export type IFreezeCommentDto = z.infer<typeof freezeComment.params>