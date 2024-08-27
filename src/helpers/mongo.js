const { MongoClient, ObjectId } = require('mongodb');

const clientMap = {};

function mongo(uri) {
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  return clientMap[uri] ||= new MongoClient(uri, opts);
}

module.exports = { mongo, ObjectId };
