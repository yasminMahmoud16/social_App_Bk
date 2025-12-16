"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const model_1 = require("../model");
const database_repository_1 = require("./database.repository");
const comment_repository_1 = require("./comment.repository");
class PostRepository extends database_repository_1.DatabaseRepository {
    model;
    commentModel = new comment_repository_1.CommentRepository(model_1.CommentModel);
    constructor(model) {
        super(model);
        this.model = model;
    }
    async findCursor({ filter, select, options }) {
        let result = [];
        const cursor = this.model.find(filter || {}).select(select || "").populate(options?.populate).cursor();
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const comment = await this.commentModel.find({
                filter: {
                    postId: doc._id,
                    commentId: { $exists: false }
                },
            });
            result.push({ post: doc, comment });
        }
        return result;
    }
    ;
}
exports.PostRepository = PostRepository;
