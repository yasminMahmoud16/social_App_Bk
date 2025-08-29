import { HydratedDocument } from "mongoose";
import { model, models, Schema } from "mongoose";




// enums 
export enum GenderEnum{
    male="male",
    female="female"
}
export enum RoleEnum{
    user="user",
    admin="admin"
}
export enum ProviderEnum{
    GOOGLE="GOOGLE",
    SYSTEM="SYSTEM"
}




// user interface 
export interface IUser {
    // _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    username?: string;

    email: string;
    tempEmail: string;
    emailUpdateOtp?: string;     
    emailUpdateRequestedAt?: Date;

    confirmEmailOtp?: string;
    confirmedAt: Date;

    password: string;
    resetPasswordOtp?: string;
    changeCredentialTime: Date;


    phone?: string;
    address?: string;
    profileImage?: string;
    coverImages?: [string];

    gender: GenderEnum;
    role: RoleEnum;
    provider: ProviderEnum;

    createdAt: Date;
    UpdatedAt?: Date;

}


// user schema

const userSchema = new Schema<IUser>(
    {
    firstName: {type:String, required:true ,minLength:2,maxLength:20},
    lastName: {type:String, required:true,minLength:2,maxLength:20},

        email: { type: String, required: true, unique: true },
      tempEmail: { type: String },         
  emailUpdateOtp: { type: String },     
  emailUpdateRequestedAt: { type: Date }, 
    confirmEmailOtp: {type:String},
    confirmedAt: {type:Date},

    password: {type:String, required:function () {
        return this.provider === ProviderEnum.GOOGLE ? false : true;
    }},
        resetPasswordOtp: { type: String },


    
    changeCredentialTime: {type:Date},
    phone: {type:String},
    address: {type:String},
    profileImage: { type: String },
    coverImages:[String],

    gender: {type:String , enum:GenderEnum, default:GenderEnum.male},
    role: {type:String , enum:RoleEnum, default:RoleEnum.user},
    provider: {type:String , enum:ProviderEnum, default:ProviderEnum.SYSTEM},

    createdAt: {type:Date},
    UpdatedAt: {type:Date},
        },
{
    timestamps: true,
    // virtual 
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
    });

// virtual fields
    
userSchema.virtual("username").set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });

}).get(function () {
    return this.firstName + " " + this.lastName;
});


export const UserModel = models.User || model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>

