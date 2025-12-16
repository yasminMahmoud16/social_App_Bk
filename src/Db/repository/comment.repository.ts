import {  HydratedDocument, Model, PopulateOptions, ProjectionType, QueryOptions, RootFilterQuery } from "mongoose";
import { IComment as TDocument} from "../model";
import { DatabaseRepository, Lean } from "./database.repository";

export class CommentRepository extends DatabaseRepository<TDocument> {

    constructor(protected override readonly model:Model<TDocument> ) {
        super(model)
    }


    

}