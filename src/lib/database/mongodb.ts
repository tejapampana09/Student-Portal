import { MongoClient } from 'mongodb';

declare global {
    var _mongoClient: MongoClient | undefined;
    var _forumsMongoClient: MongoClient | undefined;
}

export async function connectToMongoClient(): Promise<MongoClient> {
    const mainUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/srmap";
    if (!global._mongoClient) {
        global._mongoClient = new MongoClient(mainUri);
        await global._mongoClient.connect();
        console.log('✅ Connected to Main MongoDB.');
    }

    return global._mongoClient;
}

export async function connectToForumsMongoClient(): Promise<MongoClient> {
    const forumsUri = process.env.FORUMS_MONGO_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/srmap-forums";
    if (!global._forumsMongoClient) {
        global._forumsMongoClient = new MongoClient(forumsUri);
        await global._forumsMongoClient.connect();
        console.log('✅ Connected to Forums MongoDB.');
    }

    return global._forumsMongoClient;
}