import mongoose, { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { emailEvent } from "../../utils/email/email.event";
import { IUser } from "./User.model";


export enum AllowCommentsEnum{
    allow = "allow",
    deny = "deny"
};
export enum AvailabilityEnum{
    public = "public",
    friends = "friends",
    onlyMe = "only-me",
};


export enum ActionsEnum {
    like= "like",
    unLike="unlike"
}


export interface IPost {
    content?: string;
    attachments?: string[];
    assetsFolderId: string; // for DB
    allowComments: AllowCommentsEnum;
    availability: AvailabilityEnum;
    tags?: Types.ObjectId[];
    likes?: Types.ObjectId[];




    createdBy: Types.ObjectId;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;


    createdAt: Date;
    updatedAt?: Date;

};


const postSchema = new Schema<IPost>(
    {
        content: {
            type: String,
            minlength: 2, maxlength: 500000,
            required: function(){
                return !this.attachments?.length
            }
        },
    attachments: [String] ,
    assetsFolderId: { type: String, required: true }, // for DB
        allowComments:
            { type: String, enum: AllowCommentsEnum, default: AllowCommentsEnum.allow },
    
        availability:  { type: String, enum: AvailabilityEnum, default: AvailabilityEnum.public },
    
    likes:[{type:Schema.Types.ObjectId, ref:"User"}],
        tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    


        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    
    freezedAt: Date,
    freezedBy:{ type:Schema.Types.ObjectId, ref:"User"},
    
    restoredAt: Date,
    restoredBy:{ type:Schema.Types.ObjectId, ref:"User"},


    }, {
        timestamps:true
    
}
)

// send email with tags 
postSchema.post("save", async function (doc, next) {
    console.log({ doc: doc });
    console.log({this:this});
    // console.log({populated:await doc.populate("tags","email")});

    let populated = await doc.populate<{ tags: IUser[] }>({
        path: "tags",
        select: "email"
    })
    // console.log({ populated: populated.tags });

    const postLink = `${process.env.SOCIAL_APP_LINK}/post/${doc._id}`;
    const userEmail = populated.tags.map(user => user.email);
    console.log({ userEmail: userEmail });
    
            emailEvent.emit("send-tag-mentioned", {
                to: userEmail,
                postName: postLink
            })
    

    
    next();
});

postSchema.pre(["findOneAndUpdate","updateOne"], async function (next) {
        const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    next()
});
export const PostModel = models.Post || model<IPost>("Post", postSchema); 
export type HPostDocument = HydratedDocument<IPost>;