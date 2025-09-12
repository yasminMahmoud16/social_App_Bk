import { EventEmitter } from "node:events";
import { deleteFile, getFile } from "./s3.config";
import { UserRepository } from "../../Db/repository/user.repository";
import { UserModel } from "../../Db/model/User.model";

export const s3Event = new EventEmitter();

s3Event.on("trackProfileImageUpload", (data) => {
    console.log({data});


    setTimeout(async () => {
        const userModel = new UserRepository(UserModel);
        try {
            await getFile({ Key: data.Key });
            // console.log({ key: data.Key });
            


            console.log(`Done🌸👌`);
            await userModel.updateOne({
                filter: { _id: data.userId },
                update: {
                    $unset: { tempProfileImage: 1 }
                }
            });
            await deleteFile({ Key: data.oldKey });
        } catch (error: any) {
            console.log(error);
            if (error.Code === "NoSuchKey") {
                await userModel.updateOne({
                    filter: { _id: data.userId },
                    update: {
                        profileImage:data.oldKey,
                        $unset: { tempProfileImage: 1 }
                    }
                })
            }
            
        }
    }, data.expiresIn || Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECOND) * 1000
    );
    
})