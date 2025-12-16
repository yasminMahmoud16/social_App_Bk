import { log } from "console";
import {connect} from "mongoose"
import { UserModel } from "./model";

const connectDb =async ():Promise<void> => {
    try {
        const result = await connect(process.env.DB_URI as string, {
            serverSelectionTimeoutMS:30000
        });
        
        await UserModel.syncIndexes()
        log(result.models);
        log("DB Connected Successfully 🚀🚀");
    } catch (error) {
        log(`Failed To Connect Db ❌❌ `)
    }
}

export default connectDb;