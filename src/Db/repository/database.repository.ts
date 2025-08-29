import { MongooseUpdateQueryOptions, UpdateQuery,UpdateWriteOpResult } from "mongoose";
import { CreateOptions, FlattenMaps, HydratedDocument, Model, PopulateOptions, ProjectionType, QueryOptions, RootFilterQuery } from "mongoose";


export type Lean<T> = HydratedDocument<FlattenMaps<T>>;
export abstract class DatabaseRepository<TDocument> {
    // calling the model -- protected to do not apple to use the methods inside model directly if private i will not apple to see in subClasses
    constructor(protected readonly model: Model<TDocument>) { }



    async findOne({ filter, select, options }: {
        // RootFilterQuery partial on types 
        filter?: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | null,
        options?: QueryOptions<TDocument> | null
    }): Promise<
        Lean<TDocument>
        | HydratedDocument<TDocument>
        | null
    > {

        const doc = this.model.findOne(filter).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate as PopulateOptions[]);
        };
        if (options?.lean) {
            doc.lean(options?.lean)
        };
        return await doc.exec()
    }
    async create({
        data,
        options,
    }: {
        data: Partial<TDocument>[],
        options?: CreateOptions | undefined
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options)
    }


    async updateOne({
        filter,
        update,
        options
    }: {
        filter: RootFilterQuery<TDocument>,
        update: UpdateQuery<TDocument>,
        options?: MongooseUpdateQueryOptions<TDocument> | null
    }):Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(filter, {
            ...update,
            $inc: {__v:1}
        }, options)
    }
}