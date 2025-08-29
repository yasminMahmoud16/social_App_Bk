import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export interface IToken {
    jti: string,
    expiriesIn: number,
    userId: Types.ObjectId,
};


const tokenSchema = new Schema<IToken>(
    {
    jti: {
        type: String,
        required: true,
        unique: true,
    },
    expiriesIn: {
        type: Number,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
    }
}
)


export const TokenModel = models.Token || model<IToken>("Token", tokenSchema); 
export type HTokenDocument = HydratedDocument<IToken>;