const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const clientMap = {};

function mongo(uri) {
  return clientMap[uri] ||= new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
}

module.exports = { mongo, ObjectId };
