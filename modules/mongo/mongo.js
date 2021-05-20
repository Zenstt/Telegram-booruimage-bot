"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = exports.CreateIndex = exports.Aggregate_cursor = exports.Aggregate = exports.Count = exports.UpdateMany = exports.UpdateOne = exports.DeleteMany = exports.DeleteOne = exports.InsertMany = exports.InsertOne = exports.CollectionExist = exports.FindCursor = exports.Distinct = exports.Find = exports.Collection = exports.Close = exports.Connect = void 0;
const mongodb_1 = require("mongodb");
const options_1 = require("../options/options");
let DB;
let clientDB;
/**
 * Connects to the database, must be called to do any db operation
 * @param {mongo_connection} conf - Configuration
 */
async function Connect(conf = options_1.mongo_connection) {
    if (DB)
        return;
    conf = conf;
    return new Promise((resolve, reject) => {
        mongodb_1.MongoClient.connect(conf.uri, conf.options, ((err, client) => {
            if (err)
                return reject(err);
            clientDB = client;
            DB = client.db(conf.db);
            return resolve();
        }));
    });
}
exports.Connect = Connect;
/**
 * Closes the connection to the database
 */
async function Close() {
    if (!clientDB) {
        return Promise.reject("Not connected");
    }
    await clientDB.close();
}
exports.Close = Close;
/**
 * Accesses the collection given
 * @param {string} collectionName The collection to access
 */
async function Collection(collectionName) {
    if (!DB) {
        return Promise.reject("Not connected");
    }
    return DB.collection(collectionName);
}
exports.Collection = Collection;
/**
 * Gives result documents for a query
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
async function Find(collectionName, query, projection = {}, sort = {}, limit = false, skip = 0) {
    const cursor = await FindCursor(collectionName, query, projection || {}, sort, limit, skip);
    const result = await cursor.toArray();
    return limit === true ? result[0] : result;
}
exports.Find = Find;
/**
 * Gives distinct values for a field
 * @param {string} collectionName The collection to access
 * @param {string} field The field for which to return distinct values.
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} options
 */
async function Distinct(collectionName, field, query, options) {
    const collection = await Collection(collectionName);
    return collection.distinct(field, query, options);
}
exports.Distinct = Distinct;
/**
 * Creates a cursor for a query that can be used to iterate over results from MongoDB
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
async function FindCursor(collectionName, query, projection = {}, sort = {}, limit = false, skip = 0) {
    const collection = await Collection(collectionName);
    const cursor = collection.find(query, { projection });
    if (projection)
        cursor.project(projection);
    if (sort)
        cursor.sort(sort);
    if (limit)
        cursor.limit((limit == true) ? 1 : limit);
    if (skip)
        cursor.skip(skip);
    return cursor;
}
exports.FindCursor = FindCursor;
/**
 * Check if a collection name exists on the database
 * @param {string} collectionName - Collection name to check
 */
async function CollectionExist(collectionName) {
    return DB.listCollections({ name: collectionName }).hasNext();
}
exports.CollectionExist = CollectionExist;
/**
 * Inserts a single document into MongoDB. If document passed in does not contain the _id field,
 * one will be added, mutating the document.
 * @param {string} collectionName The collection to access
 * @param {any} document The object to insert
 * @param {CollectionInsertOneOptions} [options] Options for the insert
 */
async function InsertOne(collectionName, document, options = {}) {
    if (!options) {
        options = {};
    }
    const collection = await Collection(collectionName);
    return collection.insertOne(document, options);
}
exports.InsertOne = InsertOne;
/**
 * Inserts an array of documents into MongoDB. If documents passed in do not contain the _id field,
 * one will be added to each of the documents missing it, mutating the document.
 * @param {string} collectionName The collection to access
 * @param {any[]} documents The object to insert
 * @param {CollectionInsertManyOptions} [options] Options for the insert
 */
async function InsertMany(collectionName, documents, options = {}) {
    const collection = await Collection(collectionName);
    return collection.insertMany(documents, options);
}
exports.InsertMany = InsertMany;
/**
 * Deletes a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
async function DeleteOne(collectionName, query, options = {}) {
    const collection = await Collection(collectionName);
    return collection.deleteOne(query, options || {});
}
exports.DeleteOne = DeleteOne;
/**
 * Deletes multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
async function DeleteMany(collectionName, query, options = {}) {
    const collection = await Collection(collectionName);
    return collection.deleteMany(query, options || {});
}
exports.DeleteMany = DeleteMany;
/**
 *
 * Updates a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Object that specifies what and how it must be updated
 * @param {UpdateOneOptions} [options] Options for the update
 */
async function UpdateOne(collectionName, query, update, options = {}) {
    const collection = await Collection(collectionName);
    return collection.updateOne(query, update, options || {});
}
exports.UpdateOne = UpdateOne;
/**
 * Updates multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the documents that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Specifies what and how it must be updated
 * @param {UpdateManyOptions} [options] Options for the update
 */
async function UpdateMany(collectionName, query, update, options = {}) {
    const collection = await Collection(collectionName);
    return collection.updateMany(query, update, options || {});
}
exports.UpdateMany = UpdateMany;
/**
 * Returns a count of a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to count
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
async function Count(collectionName, query, limit = false) {
    const cursor = await FindCursor(collectionName, query, { _id: 1 }, {}, limit);
    return cursor.count();
}
exports.Count = Count;
/**
 * Returns an aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
async function Aggregate(collectionName, query_aggregate, options = {}) {
    const collection = await Collection(collectionName);
    return collection.aggregate(query_aggregate, options).toArray();
}
exports.Aggregate = Aggregate;
/**
 * Returns a cursor of aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
async function Aggregate_cursor(collectionName, query_aggregate, options = {}) {
    const collection = await Collection(collectionName);
    return collection.aggregate(query_aggregate, options);
}
exports.Aggregate_cursor = Aggregate_cursor;
/**
* Create a index on a collection
* @param {string} collectionName The collection to access
* @param {IndexOptions} indexData Data of index to create
*/
async function CreateIndex(collectionName, indexData = {}) {
    const collection = await Collection(collectionName);
    return collection.createIndex(indexData);
}
exports.CreateIndex = CreateIndex;
/**
* Returns the stats of a collection
* @param {string} collectionName The collection to access
*/
async function Stats(collectionName) {
    const collection = await Collection(collectionName);
    return collection.stats();
}
exports.Stats = Stats;
