import {z} from "zod";
import { logout } from "./user.validation";
import * as validators from "./user.validation"

export type ULogoutDto = z.infer<typeof logout.body>;
 export type IUpdatePasswordInputDto= z.infer<typeof validators.updatePassword.body >
 export type IUpdateEmailInputDto= z.infer<typeof validators.updateEmail.body >
 export type IConfirmUpdateEmailInputDto= z.infer<typeof validators.confirmUpdateEmail.body >
 export type IFreezeAccountDto= z.infer<typeof validators.freezeAccount.params >
 export type IRestoreAccountDto= z.infer<typeof validators.restoreAccount.params >
 export type IHardDeleteAccountDto= z.infer<typeof validators.hardDeleteAccount.params >