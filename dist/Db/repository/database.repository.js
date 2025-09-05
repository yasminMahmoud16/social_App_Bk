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
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
    async updateOne({ filter, update, options }) {
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
    async deleteOne({ filter, }) {
        return await this.model.deleteOne(filter);
    }
    ;
}
exports.DatabaseRepository = DatabaseRepository;
