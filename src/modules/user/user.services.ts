import { Request, Response } from "express";
import { IConfirmUpdateEmailInputDto, IFreezeAccountDto, IHardDeleteAccountDto, IRestoreAccountDto, IUpdateEmailInputDto, IVerifyTwoStepVerificationDto, ULogoutDto } from "./user.dto";
import { createLoginCredentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";
import { Types, UpdateQuery } from "mongoose";
import { HUserDocument, IUser, ProviderEnum, RoleEnum, UserModel } from "../../Db/model/User.model";
import { JwtPayload } from "jsonwebtoken";
import { IUpdatePasswordInputDto } from "../user/user.dto";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizeException } from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";
import { generateNumberOtp } from "../../utils/otp/otp";
import { createPreSignedUploadLink, deleteFiles, deleteFolderByPrefix, uploadFiles } from "../../utils/multer/s3.config";
import { s3Event } from "../../utils/multer/s3.event";
import { successResponse } from "../../utils/response/success.response";
import {  IProfileImageResponse, IUserResponse } from "./user.entities";
import { ILoginResponse } from "../auth/auth.entities";
import { decryptEncryption, generateEncryption } from "../../utils/security/encrypt.security";
import { UserRepository } from "../../Db/repository";

class UserServices {
    private userModel = new UserRepository(UserModel);
    // private tokenModel = new TokenRepository(TokenModel);
    constructor() { }

    profile = async (req: Request, res: Response): Promise<Response> => {



        if (!req.user) {
            throw new UnauthorizeException("missing user details ")
        }
        req.user.phone= await decryptEncryption({ciphertext:req.user.phone as unknown as string} )
        return successResponse<IUserResponse>({
            res,
            data:{user:req.user}
        });

    };
    profileImage = async (req: Request, res: Response): Promise<Response> => {
        
        const { ContentType, Originalname }: { ContentType: string, Originalname: string } = req.body;
        const { url, Key } = await createPreSignedUploadLink({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}`
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                profileImage: Key,
                tempProfileImage:req.user?.profileImage
            }
        });

        if (!user) {
            throw new BadRequestException("failed to update profile image")
        };

        s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            Key,
            expiresIn: 30000
        })
        // return res.status(200).json({
        //     message: "image uploaded",
        //     data:{url,  Key}
        // })
        return successResponse<IProfileImageResponse>({
            res,
            message: "image uploaded",
            data:{url}
        });

    };
    profileCoverImages = async (req: Request, res: Response): Promise<Response> => {

        const urls = await uploadFiles({
            // if disk change the storageApproach to disk here and in services 
            files:req.files as Express.Multer.File[],
            path: `users/${req.decoded?._id}/cover`,
            useLarge:true
        });

        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                coverImages: urls
            }
        });

        if (!user) {
            throw new BadRequestException("Failed to update profile cover images ");
        };

        if (req.user?.coverImages) {
            await deleteFiles({urls:req.user.coverImages})
            
        }
        // return res.status(200).json({
        //     message: "image uploaded",
        //     data:{urls}
        // })
        return successResponse<IUserResponse>({
            res,
            message: "image uploaded",
            data:{user}
        });

    };
    shareProfile = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params;
        const user = await this.userModel.findOne({
            filter: { _id: userId },

        })

        if (!user) {
            throw new NotFoundException("User not found")
        }

        return successResponse({
            res,
            message: "user profile",

        });

    };



    freezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = (req.params as IFreezeAccountDto) || {};
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException("Not authorized user ")
        };
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false }
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1
                }
            }

        });
        if (!user.matchedCount) {
            throw new NotFoundException("User not found or failed to delete this resource")
        }
        // return res.json({ message: "Done" })
        return successResponse({
            res,
        });
    };
    restoreAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IRestoreAccountDto ;

        const user = await this.userModel.updateOne({
            filter: {
                _id: userId ,
                freezedBy: { $ne: userId }
            },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1
                }
            }

        });
        if (!user.matchedCount) {
            throw new NotFoundException("User not found or failed to restore this resource")
        }
        // return res.json({ message: "Done" })
        return successResponse({
            res,
        });
    };
    hardDeleteAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IHardDeleteAccountDto ;

        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId ,
                freezedAt: { $exists: true }
            }

        });
        if (!user.deletedCount) {
            throw new NotFoundException("User not found or failed to hard delete this resource")
        };
        await deleteFolderByPrefix({path:`users/${userId}`})
        return successResponse({
            res,
        });
    };

    logout = async (req: Request, res: Response): Promise<Response> => {
        const { flag }: ULogoutDto = req.body;
        let statusCode: number = 200
        const update: UpdateQuery<IUser> = {};
        switch (flag) {
            case LogoutEnum.all:
                update.changeCredentialTime = new Date();
                break;

            default:
                await createRevokeToken(req.decoded as JwtPayload);
                statusCode = 201
                break;
        };

        // logout from All devices

        await this.userModel.updateOne({
            filter: {
                _id: req.user?._id
            },
            update,
        })
        // return res.status(statusCode).json({
        //     message: "Done",

        // })

        return successResponse({
            res,
            statusCode
        });

    };


    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const credentials = await createLoginCredentials(req.user as HUserDocument);
        await createRevokeToken(req.decoded as JwtPayload);

        // return res.status(201).json({
        //     message: "Done",
        //     data: {
        //         credentials
        //     }
        // })
        return successResponse<ILoginResponse>({
            res,
            statusCode: 201,
            data: {
                credentials
            }
        });

    };


    updatePassword = async (req: Request, res: Response): Promise<Response> => {

        const userId = req.user?.id as string;
        const { currentPassword, newPassword }: IUpdatePasswordInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
                provider: ProviderEnum.SYSTEM,

            }
        });
        if (!user) {

            throw new NotFoundException("Account not found or invalid provider ")
        };
        if (!await compareHash(currentPassword, user.password as string)) {

            throw new NotFoundException("Current password is incorrect ")
        };

        const result = await this.userModel.updateOne({
            filter: { _id: userId },
            update: {
                password: await generateHash(newPassword),
                changeCredentialTime: new Date(),

            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Failed to update password. Please try again")
        };


        // return res.status(201).json({ message: 'Password Updated ' });
        return successResponse({
            res,
            statusCode: 201,
            message: 'Password Updated ' 
        });
    };
    updateEmail = async (req: Request, res: Response): Promise<Response> => {

        const userId = req.user?.id as string;
        const { newEmail, currentPassword }: IUpdateEmailInputDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                _id: userId,
                provider: ProviderEnum.SYSTEM,

            }
        });
        if (!user) {

            throw new NotFoundException("Account not found or invalid provider ")
        };
        if (!await compareHash(currentPassword, user.password as string)) {

            throw new NotFoundException("invalid password")
        };

        // check email 

        if (await this.userModel.findOne({
            filter: { email: newEmail }
        })) {
            throw new ConflictException("Email already exists")
        };

        const otp = generateNumberOtp();




        const result = await this.userModel.updateOne({
            filter: { _id: userId },
            update: {
                tempEmail: newEmail,
                emailUpdateOtp: await generateHash(String(otp)),
                emailUpdateRequestedAt: new Date(),
            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Failed to update password. Please try again")
        };

        emailEvent.emit("updateEmail", { to: newEmail, otp });

        // return res.status(201).json({ message: 'Email Updated ' });
        return successResponse({
            res,
            statusCode: 201,
             message: 'Email Updated '
        });
    };

    confirmUpdatedEmail = async (req: Request, res: Response): Promise<Response> => {
        let { email, otp }: IConfirmUpdateEmailInputDto = req.body;

        const user = await this.userModel.findOne({
            filter: {
                tempEmail: email,
                emailUpdateOtp: { $exists: true }
            },

        })

        if (!user) {
            throw new NotFoundException("Invalid request or no email update pending")
        };

        if (!await compareHash(otp, user.emailUpdateOtp as string)) {
            throw new BadRequestException("in-valid confirmation code")
        }

        await this.userModel.updateOne({
            filter: { _id: user._id },

            update: {
                email: user.tempEmail,
                confirmedAt: new Date(),
                $unset: {
                    tempEmail: 1,
                    emailUpdateOtp: 1,
                    emailUpdateRequestedAt: 1,
                },
            }
        })


        // return res.status(200).json({ message: 'Email confirmed' })
        return successResponse({
            res,
            message: 'Email confirmed' 
        });
    }
    updateBasicProfileInfo = async (req: Request, res: Response): Promise<Response> => {
        if (req.body.phone) {
            req.body.phone = await generateEncryption({plainText:req.body.phone})
        }

        const user =await this.userModel.findByIdAndUpdate({
                id: req.user?._id as Types.ObjectId,


            update: {
                $set: req.body,
                $inc: { __v: 1 }
            }
        })


        // return res.status(200).json({ message: 'Email confirmed' })
        return successResponse({
            res,
            message: 'Basic profile info updated successfully ',
            data:{user}
        });
    }


    // 2 step verification

    twoStepVerification = async (req: Request, res: Response): Promise<Response> => {



        
        if (!req.user) {
            throw new UnauthorizeException("missing user details")
        }
        const otp = await generateNumberOtp();
         const expireOtp = new Date(Date.now() + 2 * 60 * 1000); 

        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as unknown as Types.ObjectId,
            update: {
                // verifyTwoStepsOtp: await generateHash(String(otp)),
                verifyTwoStepsOtp: `${otp}`,
                verifyTwoStepsOtpExpiresAt:expireOtp
            }
        });
        await emailEvent.emit("2-step-verification-otp",{to:req.user.email ,otp})
        return successResponse<IUserResponse>({
            res,
            message:"Otp send, Please check your email",
        });

    };
    verifyTwoStepVerification = async (req: Request, res: Response): Promise<Response> => {

        let { email, otp }:IVerifyTwoStepVerificationDto = req.body;

        const user = await this.userModel.findOne({
                    filter: {
                        email,
                        verifyTwoStepsOtp: { $exists: true },
                        verifyTwoStepsOtpAt: { $exists: false },
                    },
        
                });
        
                if (!user) {
                    throw new NotFoundException("in-valid data or account already verified")
                };
        
                if (!await compareHash(otp, user.verifyTwoStepsOtp as string)) {
                    throw new BadRequestException("in-valid confirmation code")
        };
        const now = new Date();
        if (user.verifyTwoStepsOtpExpiresAt && now > user.verifyTwoStepsOtpExpiresAt) {
            throw new BadRequestException("2-steps-verification otp expires ")
        }
        
                await this.userModel.updateOne({
                    filter: { email },
                    update: {
                        verifyTwoStepsOtpAt: new Date(),
                        $unset: {
                            verifyTwoStepsOtp: 1,
                        }
                    }
                });
        return successResponse<IUserResponse>({
            res,
            message:" 2-steps-verification enabled successfully on your account",
        });

    };
};

export default new UserServices();