import mongoose, { HydratedDocument, Types, UpdateQuery } from "mongoose";
import { model, models, Schema } from "mongoose";

import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";


export type HUserDocument = HydratedDocument<IUser>

// enums 
export enum GenderEnum {
    male = "male",
    female = "female"
}
export enum RoleEnum {
    user = "user",
    admin = "admin"
}
export enum ProviderEnum {
    GOOGLE = "GOOGLE",
    SYSTEM = "SYSTEM"
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
    confirmEmailOtpExpiresIn?: Date;
    confirmedAt: Date;

    password: string;
    resetPasswordOtp?: string;
    changeCredentialTime: Date;


    phone?: string;
    address?: string;
    profileImage?: string;
    tempProfileImage?: string;
    coverImages?: string[];

    gender: GenderEnum;
    role: RoleEnum;
    provider: ProviderEnum;

    freezedAt: Date
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;


    verifyTwoStepsOtp?: string;
    verifyTwoStepsOtpAt?: Date;
    verifyTwoStepsOtpExpiresAt?: Date;
    confirmLoginOtpAt?: Date;
    confirmLoginOtpExpiresAt?: Date;
    confirmLoginOtp?: string;

    createdAt: Date;
    UpdatedAt?: Date;

}


// user schema

const userSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true, minLength: 2, maxLength: 20 },
        lastName: { type: String, required: true, minLength: 2, maxLength: 20 },

        email: { type: String, required: true, unique: true },
        tempEmail: { type: String },
        emailUpdateOtp: { type: String },
        emailUpdateRequestedAt: { type: Date },
        confirmEmailOtp: { type: String },
        confirmedAt: { type: Date },
        confirmEmailOtpExpiresIn: { type: Date },


        verifyTwoStepsOtpAt: { type: Date },
        verifyTwoStepsOtpExpiresAt: { type: Date },
        verifyTwoStepsOtp: { type: String },
        confirmLoginOtp: { type: String },
        confirmLoginOtpAt: { type: Date },
        confirmLoginOtpExpiresAt: { type: Date },

        password: {
            type: String, required: function () {
                return this.provider === ProviderEnum.GOOGLE ? false : true;
            }
        },
        resetPasswordOtp: { type: String },



        changeCredentialTime: { type: Date },
        phone: { type: String },
        address: { type: String },
        profileImage: { type: String },
        tempProfileImage: { type: String },
        coverImages: [String],

        gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
        role: { type: String, enum: RoleEnum, default: RoleEnum.user },
        provider: { type: String, enum: ProviderEnum, default: ProviderEnum.SYSTEM },

        freezedAt: { type: Date },
        freezedBy: { type: Schema.Types.ObjectId, ref: "User" },
        restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
        restoredAt: { type: Date },
        createdAt: { type: Date },
        UpdatedAt: { type: Date },
    },
    {
        timestamps: true,
        // virtual 
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// virtual fields

userSchema.virtual("username").set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });

}).get(function () {
    return this.firstName + " " + this.lastName;
});


// userSchema.pre('insertMany', async function (next, docs) {

//     console.log({ this: this, docs })
//     for (const doc of docs) {
//         doc.password = await generateHash(doc.password)
//     }
// });
// userSchema.post('findOneAndUpdate', async function (doc,next) {
//     const query = this.getQuery();
//     const update = this.getUpdate() as UpdateQuery<HUserDocument>;
//     // if (update.freezedAt) {
//     //     this.setUpdate({ ...update, changeCredentialTime: new Date() })
//     // };

//     if (update["$set"].changeCredentialTime) {
//         const tokenModel = new TokenRepository(TokenModel);
//         await tokenModel.deleteMany({
//             filter: { userId: query._id }
//         })
//     }
//     console.log({ query, updateFromPost:update["$set"].changeCredentialTime })
// });


userSchema.pre("save", async function (this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string }
    , next) {
    // hash password signup

    this.wasNew= this.isNew
    if (this.isModified("password")) {
        this.password = await generateHash(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
        this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }
    // if (this.isModified("verifyTwoStepsOtp")) {
    //     this.verifyTwoStepsOtp = await generateHash(this.verifyTwoStepsOtp as string);
    // }

    next()
});

userSchema.post("save", async function (doc, next) {
    const that = this as HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string };
    
    if (that.wasNew && that.confirmEmailPlainOtp) {
        emailEvent.emit("confirmEmail", {
            to: this.email,
            otp: that.confirmEmailPlainOtp
        })

    }
    next();
});

userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({...query})
    } else {
        
        this.setQuery({...query,freezedAt:{$exists:false }})
    }
    next()
})

userSchema.pre(["findOneAndUpdate", "findOne"], async function (next) {
    const query = this.getQuery();

    const update = this.getUpdate() as (UpdateQuery<IUser> & { verifyTwoStepsOtp?: string,  }) | undefined;

    console.log({ update });
    console.log({ query });
    console.log({ otp: update?.verifyTwoStepsOtp });
    
    if (update?.verifyTwoStepsOtp) {
        update.verifyTwoStepsOtp = await generateHash(update.verifyTwoStepsOtp as string);
    }



    next();
});



export const UserModel = models.User || model<IUser>("User", userSchema);

