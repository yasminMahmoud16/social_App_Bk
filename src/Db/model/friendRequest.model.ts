import mongoose, { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { emailEvent } from "../../utils/email/email.event";
import { IUser } from "./User.model";
import { IPost } from "./post.model";





export interface IFriendRequest {
    createdBy: Types.ObjectId;
    sendTo: Types.ObjectId | Partial<IPost>;
    acceptedAt: Date;
    createdAt: Date;
    updatedAt?: Date;

};


const friendRequestSchema = new Schema<IFriendRequest>(
    {
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        sendTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
        acceptedAt: Date,
    


    }, {
        timestamps: true,
        strictQuery: true,
        toObject: {
            virtuals: true
        },
        toJSON: {
            virtuals: true
        }
    
}
)


friendRequestSchema.pre(["findOne","find","countDocuments"], async function (next) {
        const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    // console.log(this.getQuery());
    
    next()
});
friendRequestSchema.pre(["findOneAndUpdate","updateOne"], async function (next) {
        const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    // console.log(this.getQuery());
    
    next()
});

export const FriendRequestModel = models.FriendRequest || model<IFriendRequest>("FriendRequest", friendRequestSchema); 
export type HFriendRequestDocument = HydratedDocument<IFriendRequest>;