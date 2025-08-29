import { Request, Response } from "express";
import { IConfirmUpdateEmailInputDto, IUpdateEmailInputDto, ULogoutDto } from "./user.dto";
import { createLoginCredentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";
import { UpdateQuery } from "mongoose";
import { HUserDocument, IUser, ProviderEnum, UserModel } from "../../Db/model/User.model";
import { UserRepository } from "../../Db/repository/user.repository.";
import { TokenModel } from "../../Db/model/token.model";
import { TokenRepository } from "../../Db/repository/token.repository";
import { JwtPayload } from "jsonwebtoken";
import { IUpdatePasswordInputDto } from "../user/user.dto";
import { BadRequestException, ConflictException, NotFoundException } from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/events/email.event";
import { generateNumberOtp } from "../../utils/otp/otp";

class UserServices {
    private userModel = new UserRepository(UserModel);
    private tokenModel = new TokenRepository(TokenModel);
    constructor() { }

    profile = async (req: Request, res: Response): Promise<Response> => {

        return res.status(200).json({
            message: "user profile",
            user: req.user,
            decoded: req.decoded?.iat
        })

    };
    shareProfile = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params;
        const user = await this.userModel.findOne({
            filter: { _id: userId },

        })

        if (!user) {
            throw new NotFoundException("User not found")
        }


        return res.status(200).json({
            message: "user profile",
            data: { user }
        })

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
        return res.status(statusCode).json({
            message: "Done",

        })

    };


    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const credentials = await createLoginCredentials(req.user as HUserDocument);
        await createRevokeToken(req.decoded as JwtPayload);

        return res.status(201).json({
            message: "Done",
            data: {
                credentials
            }
        })

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


        return res.status(201).json({ message: 'Password Updated ' });
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

        return res.status(201).json({ message: 'Email Updated ' });
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


        return res.status(200).json({ message: 'Email confirmed' })
    }
};

export default new UserServices();