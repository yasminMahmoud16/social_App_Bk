import { z } from "zod"
import { generalFields } from "../../middleware/validation.middleware"



export const getChat = {
    params: z.strictObject({
        userId:generalFields.id
    }),
}