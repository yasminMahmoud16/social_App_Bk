"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async findOne({ filter, select, options }) {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate);
        }
        ;
        if (options?.lean) {
            doc.lean(options?.lean);
        }
        ;
        return await doc.exec();
    }
    async findById({ id, select, options }) {
        const doc = this.model.findById(id).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate);
        }
        ;
        if (options?.lean) {
            doc.lean(options?.lean);
        }
        ;
        return await doc.exec();
    }
    async find({ filter, select, options }) {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate);
        }
        ;
        if (options?.lean) {
            doc.lean(options?.lean);
        }
        ;
        if (options?.skip) {
            doc.skip(options?.skip);
        }
        ;
        if (options?.limit) {
            doc.limit(options?.limit);
        }
        ;
        return await doc.exec();
    }
    ;
    async paginate({ filter = {}, select, options = {}, page = "all", size = 5 }) {
        let docsCount = undefined;
        let pages = undefined;
        if (page !== "all") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 || !size ? 5 : size);
            options.skip = (page - 1) * options.limit;
            console.log(await this.model.estimatedDocumentCount());
            console.log(await this.model.countDocuments(filter));
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }
        const result = await this.find({ filter, select, options });
        return {
            docsCount,
            limit: options.limit,
            currentPage: page !== "all" ? page : undefined,
            result
        };
    }
    ;
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
    async insertMany({ data, }) {
        return await this.model.insertMany(data);
    }
    async updateOne({ filter, update, options }) {
        if (Array.isArray(update)) {
            update.push({
                $set: {
                    __v: { $add: ["$__v", 1] }
                }
            });
            return await this.model.updateOne(filter || {}, update, options);
        }
        ;
        console.log({
            ...update,
            $inc: { __v: 1 }
        });
        return await this.model.updateOne(filter, {
            ...update,
            $inc: { __v: 1 }
        }, options);
    }
    ;
    async updateMany({ filter, update, options }) {
        if (Array.isArray(update)) {
            update.push({
                $set: {
                    __v: { $add: ["$__v", 1] }
                }
            });
            return await this.model.updateMany(filter || {}, update, options);
        }
        ;
        console.log({
            ...update,
            $inc: { __v: 1 }
        });
        return await this.model.updateOne(filter, {
            ...update,
            $inc: { __v: 1 }
        }, options);
    }
    ;
    async findByIdAndUpdate({ id, update, options = { new: true } }) {
        return await this.model.findByIdAndUpdate(id, {
            ...update,
            $inc: { __v: 1 }
        }, options);
    }
    ;
    async findOneAndUpdate({ filter, update, options = { new: true } }) {
        return await this.model.findOneAndUpdate(filter, {
            ...update,
            $inc: { __v: 1 }
        }, options);
    }
    ;
    async deleteOne({ filter, options }) {
        return await this.model.deleteOne(filter, options);
    }
    ;
    async findOneAndDelete({ filter, options }) {
        return await this.model.findOneAndDelete(filter, options);
    }
    ;
    async deleteMany({ filter, }) {
        return await this.model.deleteMany(filter);
    }
    ;
}
exports.DatabaseRepository = DatabaseRepository;
