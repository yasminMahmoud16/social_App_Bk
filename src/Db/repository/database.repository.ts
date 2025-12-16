import { DeleteOptions } from "mongodb";
import { DeleteResult, MongooseBaseQueryOptions, Types } from "mongoose";
import { MongooseUpdateQueryOptions, UpdateQuery, UpdateWriteOpResult } from "mongoose";
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
            doc.populate(options?.populate as PopulateOptions | PopulateOptions[]);
        };
        if (options?.lean) {
            doc.lean(options?.lean)
        };
        return await doc.exec()
    }
    async findById({ id, select, options }: {
        // RootFilterQuery partial on types 
        id?: RootFilterQuery<TDocument> | any,
        select?: ProjectionType<TDocument> | null,
        options?: QueryOptions<TDocument> | null
    }): Promise<
        Lean<TDocument>
        | HydratedDocument<TDocument>
        | null
    > {

        const doc = this.model.findById(id).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate as PopulateOptions[]);
        };
        if (options?.lean) {
            doc.lean(options?.lean)
        };
        return await doc.exec()
    }
    async find({ filter, select, options }: {
        // RootFilterQuery partial on types 
        filter?: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<
        HydratedDocument<TDocument>[]
        | []
        |Lean<TDocument>[]
    > {

        const doc = this.model.find(filter||{}).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate as PopulateOptions[]);
        };
        if (options?.lean) {
            doc.lean(options?.lean)
        };
        if (options?.skip) {
            doc.skip(options?.skip)
        };
        if (options?.limit) {
            doc.limit(options?.limit)
        };
        return await doc.exec()
    };
    async paginate({
        filter={},
        select,
        options={},
        page = "all",
        size=5
    }: {
        // RootFilterQuery partial on types 
        filter: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | undefined,
            options?: QueryOptions<TDocument> | undefined
        page?:number |"all",
        size?:number,
    }): Promise<
        HydratedDocument<TDocument>[]
        | []
        |Lean<TDocument>[]| any
        > {
        let docsCount: number | undefined = undefined;
        let pages: number | undefined = undefined;
        if (page !== "all") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 || !size ? 5 : size);
            options.skip = (page - 1) * options.limit;
            
            console.log(await this.model.estimatedDocumentCount()); //collection meta data / fast /without filter
            console.log(await this.model.countDocuments(filter)); //with filter / count the freeze / query middleware
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }
        const result = await this.find({filter,select,options})
        

        
        return {
            docsCount,
            limit: options.limit,
            currentPage: page !== "all"? page:undefined,
            result
        }
    };
    async create({
        data,
        options,
    }: {
        data: Partial<TDocument>[],
        options?: CreateOptions | undefined
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options)
    }
    async insertMany({
        data,
    }: {
        data: Partial<TDocument>[],
    }): Promise<HydratedDocument<TDocument>[] > {
        return await this.model.insertMany(data) as HydratedDocument<TDocument>[];
    }


    async updateOne({
        filter,
        update,
        options
    }: {
        filter: RootFilterQuery<TDocument>,
        update?: UpdateQuery<TDocument>,
        options?: MongooseUpdateQueryOptions<TDocument> | null
        }): Promise<UpdateWriteOpResult> {
        if (Array.isArray(update)) {
            update.push({
                $set: {
                    __v:{$add:["$__v",1]}
                }
            })
            return await this.model.updateOne(filter || {}, update, options)
        };
    
        console.log({
            ...update,
            $inc: { __v: 1 }
        });
        
        return await this.model.updateOne(filter, {
            ...update,
            $inc: { __v: 1 }
        }, options)
    };
    async updateMany({
        filter,
        update,
        options
    }: {
        filter: RootFilterQuery<TDocument>,
        update?: UpdateQuery<TDocument>,
        options?: MongooseUpdateQueryOptions<TDocument> | null
        }): Promise<UpdateWriteOpResult> {
        if (Array.isArray(update)) {
            update.push({
                $set: {
                    __v:{$add:["$__v",1]}
                }
            })
            return await this.model.updateMany(filter || {}, update, options)
        };
    
        console.log({
            ...update,
            $inc: { __v: 1 }
        });
        
        return await this.model.updateOne(filter, {
            ...update,
            $inc: { __v: 1 }
        }, options)
    };


    async findByIdAndUpdate({
        id,
        update,
        options = { new: true }
    }: {
        id?: Types.ObjectId,
        update?: UpdateQuery<TDocument>,
        options?: QueryOptions<TDocument> | null
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return await this.model.findByIdAndUpdate(
            id, {
            ...update,
            $inc: { __v: 1 }
        }, options)
    };
    async findOneAndUpdate({
        filter,
        update,
        options = { new: true }
    }: {
        filter?: RootFilterQuery<TDocument>,
        update?: UpdateQuery<TDocument>,
        options?: QueryOptions<TDocument> | null
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return await this.model.findOneAndUpdate(
            filter, {
            ...update,
            $inc: { __v: 1 }
        }, options)
    };



    async deleteOne({
        filter,
        options

    }: {
            filter: RootFilterQuery<TDocument>,
            options?: (DeleteOptions & MongooseBaseQueryOptions<TDocument>) | null
        

        }): Promise<DeleteResult> {
        return await this.model.deleteOne(filter, options);
    };


    async findOneAndDelete({
        filter,
        options

    }: {
            filter: RootFilterQuery<TDocument>,
            options?: QueryOptions<TDocument> | null

    }): Promise<HydratedDocument<TDocument> | null> {
        return await this.model.findOneAndDelete(filter,options);
    };
    async deleteMany({
        filter,

    }: {
        filter: RootFilterQuery<TDocument>,

    }): Promise<DeleteResult> {
        return await this.model.deleteMany(filter);
    };
}