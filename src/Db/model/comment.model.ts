import mongoose, { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { emailEvent } from "../../utils/email/email.event";
import { IUser } from "./User.model";
import { IPost } from "./post.model";





export interface IComment {
    postId: Types.ObjectId | Partial<IPost>;
    commentId?: Types.ObjectId ;
    content?: string;
    attachments?: string[];
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


const commentSchema = new Schema<IComment>(
    {
        content: {
            type: String,
            minlength: 2, maxlength: 500000,
            required: function(){
                return !this.attachments?.length
            }
        },
    attachments: [String] ,
        

    
    likes:[{type:Schema.Types.ObjectId, ref:"User"}],
        tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    


        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
        commentId: { type: Schema.Types.ObjectId, ref: "Comment"},
    
    freezedAt: Date,
    freezedBy:{ type:Schema.Types.ObjectId, ref:"User"},
    
    restoredAt: Date,
    restoredBy:{ type:Schema.Types.ObjectId, ref:"User"},


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

// // send email with tags 
// commentSchema.post("save", async function (doc, next) {
//     console.log({ doc: doc });
//     console.log({this:this});
//     // console.log({populated:await doc.populate("tags","email")});

//     let populated = await doc.populate<{ tags: IUser[] }>({
//         path: "tags",
//         select: "email"
//     })
//     // console.log({ populated: populated.tags });

//     const postLink = `${process.env.SOCIAL_APP_LINK}/post/${doc._id}`;
//     const userEmail = populated.tags.map(user => user.email);
//     console.log({ userEmail: userEmail });
    
//             emailEvent.emit("send-tag-mentioned", {
//                 to: userEmail,
//                 postName: postLink
//             })
    

    
//     next();
// });

commentSchema.pre(["findOne","find","countDocuments"], async function (next) {
        const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    // console.log(this.getQuery());
    
    next()
});
commentSchema.pre(["findOneAndUpdate","updateOne","updateMany"], async function (next) {
    const query = this.getQuery();
    // console.log({CommentQuery:query});
    
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    // console.log(this.getQuery());
    
    next()
});

commentSchema.virtual("reply", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    justOne:true
})
export const CommentModel = models.Comment || model<IComment>("Comment", commentSchema); 
export type HCommentDocument = HydratedDocument<IComment>;