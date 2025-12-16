"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = exports.ActionsEnum = exports.AvailabilityEnum = exports.AllowCommentsEnum = void 0;
const mongoose_1 = require("mongoose");
const email_event_1 = require("../../utils/email/email.event");
var AllowCommentsEnum;
(function (AllowCommentsEnum) {
    AllowCommentsEnum["allow"] = "allow";
    AllowCommentsEnum["deny"] = "deny";
})(AllowCommentsEnum || (exports.AllowCommentsEnum = AllowCommentsEnum = {}));
;
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum["public"] = "public";
    AvailabilityEnum["friends"] = "friends";
    AvailabilityEnum["onlyMe"] = "only-me";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
;
var ActionsEnum;
(function (ActionsEnum) {
    ActionsEnum["like"] = "like";
    ActionsEnum["unLike"] = "unlike";
})(ActionsEnum || (exports.ActionsEnum = ActionsEnum = {}));
;
const postSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minlength: 2, maxlength: 500000,
        required: function () {
            return !this.attachments?.length;
        }
    },
    attachments: [String],
    assetsFolderId: { type: String, required: true },
    allowComments: { type: String, enum: AllowCommentsEnum, default: AllowCommentsEnum.allow },
    availability: { type: String, enum: AvailabilityEnum, default: AvailabilityEnum.public },
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    freezedAt: Date,
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: Date,
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    strictQuery: true,
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});
postSchema.post("save", async function (doc, next) {
    let populated = await doc.populate({
        path: "tags",
        select: "email"
    });
    const postLink = `${process.env.SOCIAL_APP_LINK}/post/${doc._id}`;
    const userEmail = populated.tags.map(user => user.email);
    console.log({ userEmail: userEmail });
    email_event_1.emailEvent.emit("send-tag-mentioned", {
        to: userEmail,
        postName: postLink
    });
    next();
});
postSchema.pre(["findOne", "find", "countDocuments"], async function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
postSchema.pre(["findOneAndUpdate", "updateOne"], async function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment",
    justOne: true
});
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", postSchema);
