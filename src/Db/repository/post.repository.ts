import {  HydratedDocument, Model, PopulateOptions, ProjectionType, QueryOptions } from "mongoose";
import {  CommentModel, IPost as TDocument} from "../model";
import { DatabaseRepository, Lean } from "./database.repository";
import { CommentRepository } from "./comment.repository";
import { RootFilterQuery } from "mongoose";

export class PostRepository extends DatabaseRepository<TDocument> {
    private commentModel = new CommentRepository(CommentModel);

    constructor(protected override readonly model:Model<TDocument> ) {
        super(model)
    }


    async findCursor({ filter, select, options }: {
        // RootFilterQuery partial on types 
        filter?: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<
        HydratedDocument<TDocument>[]
        | []
        | Lean<TDocument>[]
        |any
    > {
        let result = [] as HydratedDocument<TDocument>[];


        // get the parent child with mongoose stream cursor 
        const cursor = this.model.find(filter || {}).select(select || "").populate(options?.populate as PopulateOptions[]).cursor()

        for (let doc = await cursor.next(); doc != null; doc= await cursor.next()) {
            const comment = await this.commentModel.find({
                filter: {
                    postId: doc._id,
                    commentId: { $exists: false }
                },

            });
            result.push({ post:doc, comment })



        }
        return result
    };

    

}