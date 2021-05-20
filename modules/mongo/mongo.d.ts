import { CollectionInsertOneOptions, CollectionInsertManyOptions, CommonOptions, FilterQuery, UpdateQuery, UpdateOneOptions, CollectionAggregationOptions, IndexOptions, UpdateManyOptions } from 'mongodb';
/**
 * Connects to the database, must be called to do any db operation
 * @param {mongo_connection} conf - Configuration
 */
export declare function Connect(conf?: any): Promise<unknown>;
/**
 * Closes the connection to the database
 */
export declare function Close(): Promise<undefined>;
/**
 * Accesses the collection given
 * @param {string} collectionName The collection to access
 */
export declare function Collection(collectionName: string): Promise<import("mongodb").Collection<any>>;
/**
 * Gives result documents for a query
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export declare function Find(collectionName: string, query: FilterQuery<any>, projection?: object, sort?: string | object, limit?: number | boolean, skip?: number): Promise<any>;
/**
 * Gives distinct values for a field
 * @param {string} collectionName The collection to access
 * @param {string} field The field for which to return distinct values.
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} options
 */
export declare function Distinct(collectionName: string, field: string, query: FilterQuery<any>, options: Object): Promise<any[]>;
/**
 * Creates a cursor for a query that can be used to iterate over results from MongoDB
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to find
 * @param {Object} projection Specifies the wanted fields for the query
 * @param {string|object} sort Specifies the order that the data should has
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export declare function FindCursor(collectionName: string, query: FilterQuery<any>, projection?: object, sort?: string | object, limit?: number | boolean, skip?: number): Promise<import("mongodb").Cursor<any>>;
/**
 * Check if a collection name exists on the database
 * @param {string} collectionName - Collection name to check
 */
export declare function CollectionExist(collectionName: string): Promise<boolean>;
/**
 * Inserts a single document into MongoDB. If document passed in does not contain the _id field,
 * one will be added, mutating the document.
 * @param {string} collectionName The collection to access
 * @param {any} document The object to insert
 * @param {CollectionInsertOneOptions} [options] Options for the insert
 */
export declare function InsertOne(collectionName: string, document: any, options?: CollectionInsertOneOptions): Promise<import("mongodb").InsertOneWriteOpResult<any>>;
/**
 * Inserts an array of documents into MongoDB. If documents passed in do not contain the _id field,
 * one will be added to each of the documents missing it, mutating the document.
 * @param {string} collectionName The collection to access
 * @param {any[]} documents The object to insert
 * @param {CollectionInsertManyOptions} [options] Options for the insert
 */
export declare function InsertMany(collectionName: string, documents: any[], options?: CollectionInsertManyOptions): Promise<import("mongodb").InsertWriteOpResult<any>>;
/**
 * Deletes a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
export declare function DeleteOne(collectionName: string, query: FilterQuery<any>, options?: CommonOptions): Promise<import("mongodb").DeleteWriteOpResultObject>;
/**
 * Deletes multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to delete
 * @param {CommonOptions} [options] Options for the delete
 */
export declare function DeleteMany(collectionName: string, query: FilterQuery<any>, options?: CommonOptions): Promise<import("mongodb").DeleteWriteOpResultObject>;
/**
 *
 * Updates a document in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Object that specifies what and how it must be updated
 * @param {UpdateOneOptions} [options] Options for the update
 */
export declare function UpdateOne(collectionName: string, query: FilterQuery<any>, update: UpdateQuery<any> | Partial<any>, options?: UpdateOneOptions): Promise<import("mongodb").UpdateWriteOpResult>;
/**
 * Updates multiple documents in a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the documents that you want to update
 * @param {UpdateQuery<any> | Partial<any>} update Specifies what and how it must be updated
 * @param {UpdateManyOptions} [options] Options for the update
 */
export declare function UpdateMany(collectionName: string, query: FilterQuery<any>, update: UpdateQuery<any> | Partial<any>, options?: UpdateManyOptions): Promise<import("mongodb").UpdateWriteOpResult>;
/**
 * Returns a count of a collection
 * @param {string} collectionName The collection to access
 * @param {FilterQuery<any>} query Mongo query, to select the document(s) that you want to count
 * @param {boolean|number} limit specifies the number of documents to retrieve, true means 1
 */
export declare function Count(collectionName: string, query: FilterQuery<any>, limit?: number | boolean): Promise<number>;
/**
 * Returns an aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
export declare function Aggregate(collectionName: string, query_aggregate: object[], options?: CollectionAggregationOptions): Promise<any[]>;
/**
 * Returns a cursor of aggregation query
 * @param {string} collectionName The collection to access
 * @param {object[]} query_aggregate Mongo aggregate query, to select the document(s) that you want to count
 * @param {CollectionAggregationOptions} [options] Options for the update
 */
export declare function Aggregate_cursor(collectionName: string, query_aggregate: object[], options?: CollectionAggregationOptions): Promise<import("mongodb").AggregationCursor<any>>;
/**
* Create a index on a collection
* @param {string} collectionName The collection to access
* @param {IndexOptions} indexData Data of index to create
*/
export declare function CreateIndex(collectionName: string, indexData?: IndexOptions): Promise<string>;
/**
* Returns the stats of a collection
* @param {string} collectionName The collection to access
*/
export declare function Stats(collectionName: string): Promise<import("mongodb").CollStats>;
