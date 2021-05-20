"use strict";
import { MongoClient, Db, CollectionInsertOneOptions, CollectionInsertManyOptions, CommonOptions, FilterQuery, UpdateQuery, UpdateOneOptions, CollectionAggregationOptions, IndexOptions, UpdateManyOptions } from 'mongodb';
import { mongo_connection } from '../options/options';

let DB: Db;
let clientDB: MongoClient;

/**
 * Connects to the database, must be called to do any db operation
 * @param {mongo_connection} conf - Configuration
 */
export async function Connect(conf: any = mongo_connection) {
    if (DB) return;
    conf = conf;
    return new Promise((resolve, reject) => {
        MongoClient.connect(conf.uri, conf.options, ((err, client) => {
            if (err) return reject(err);
            clientDB = client;
            DB = client.db(conf.db);
            return resolve();
        }));
    })
}


/**
 * Closes the connection to the database
 */
export async function Close() {
    if (!clientDB) { return Promise.reject("Not connected"); }
    await clientDB.close();
}

/**
 * Accesses the collection given
 * @param {string} collectionName The collection to access
 */
export async function Collection(collectionName: string) {
    if (!DB) { return Promise.reject("Not connected"); }
    return DB.collection(collectionName);
}

/**
 * Gives result documents for a query 
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export async function Find(collectionName: string, query: FilterQuery<any>, projection: object = {}, sort: string | object = {}, limit: number | boolean = false, skip: number = 0) {
    const cursor = await FindCursor(collectionName, query, projection || {}, sort, limit, skip);
    const result = await cursor.toArray();
    return limit === true ? result[0] : result;
}

/**
 * Gives distinct values for a field
 * @param {string} collectionName The collection to access
 * @param {string} field The field for which to return distinct values.
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} options
 */
export async function Distinct(collectionName: string, field: string, query: FilterQuery<any>, options: Object) {
    const collection = await Collection(collectionName);
    return collection.distinct(field, query, options);
}

/**
 * Creates a cursor for a query that can be used to iterate over results from MongoDB
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export async function FindCursor(collectionName: string, query: FilterQuery<any>, projection: object = {}, sort: string | object = {}, limit: number | boolean = false, skip: number = 0) {
    const collection = await Collection(collectionName);
    const cursor = collection.find(query, { projection });
    if (projection) cursor.project(projection);
    if (sort) cursor.sort(sort);
    if (limit) cursor.limit((limit == true) ? 1 : limit);
    if (skip) cursor.skip(skip);
    return cursor;
}

/**
 * Check if a collection name exists on the database
 * @param {string} collectionName - Collection name to check
 */
export async function CollectionExist(collectionName: string) {
    return DB.listCollections({ name: collectionName }).hasNext();
}

/**
 * Inserts a single document into MongoDB. If document passed in does not contain the _id field,
 * one will be added, mutating the document. 
 * @param {string} collectionName The collection to access
 * @param {any} document The object to insert
 * @param {CollectionInsertOneOptions} [options] Options for the insert
 */
export async function InsertOne(collectionName: string, document: any, options: CollectionInsertOneOptions = {}) {
    if (!options) { options = {}; }
    const collection = await Collection(collectionName);
    return collection.insertOne(document, options);
}

/**
 * Inserts an array of documents into MongoDB. If documents passed in do not contain the _id field,
 * one will be added to each of the documents missing it, mutating the document. 
 * @param {string} collectionName The collection to access
 * @param {any[]} documents The object to insert
 * @param {CollectionInsertManyOptions} [options] Options for the insert
 */
export async function InsertMany(collectionName: string, documents: any[], options: CollectionInsertManyOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.insertMany(documents, options);
}

/**
 * Deletes a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
export async function DeleteOne(collectionName: string, query: FilterQuery<any>, options: CommonOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.deleteOne(query, options || {});
}

/**
 * Deletes multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
export async function DeleteMany(collectionName: string, query: FilterQuery<any>, options: CommonOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.deleteMany(query, options || {});
}

/**
 * 
 * Updates a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Object that specifies what and how it must be updated
 * @param {UpdateOneOptions} [options] Options for the update
 */
export async function UpdateOne(collectionName: string, query: FilterQuery<any>, update: UpdateQuery<any> | Partial<any>, options: UpdateOneOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.updateOne(query, update, options || {});
}

/**
 * Updates multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the documents that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Specifies what and how it must be updated
 * @param {UpdateManyOptions} [options] Options for the update
 */
export async function UpdateMany(collectionName: string, query: FilterQuery<any>, update: UpdateQuery<any> | Partial<any>, options: UpdateManyOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.updateMany(query, update, options || {});
}

/**
 * Returns a count of a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to count
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export async function Count(collectionName: string, query: FilterQuery<any>, limit: number | boolean = false) {
    const cursor = await FindCursor(collectionName, query, { _id: 1 }, {}, limit);
    return cursor.count();
}

/**
 * Returns an aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
export async function Aggregate(collectionName: string, query_aggregate: object[], options: CollectionAggregationOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.aggregate(query_aggregate, options).toArray();
}

/**
 * Returns a cursor of aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
export async function Aggregate_cursor(collectionName: string, query_aggregate: object[], options: CollectionAggregationOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.aggregate(query_aggregate, options);
}

/**
* Create a index on a collection
* @param {string} collectionName The collection to access
* @param {IndexOptions} indexData Data of index to create
*/
export async function CreateIndex(collectionName: string, indexData: IndexOptions = {}) {
    const collection = await Collection(collectionName);
    return collection.createIndex(indexData);
}

/**
* Returns the stats of a collection
* @param {string} collectionName The collection to access
*/
export async function Stats(collectionName: string) {
    const collection = await Collection(collectionName);
    return collection.stats();
}