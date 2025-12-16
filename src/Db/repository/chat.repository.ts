
import { Model } from "mongoose";
import { IChat as TDocument} from "../model";
import { DatabaseRepository } from "./database.repository";

export class ChatRepository extends DatabaseRepository<TDocument> {

    constructor(protected override readonly model:Model<TDocument> ) {
        super(model)
    }


    

}