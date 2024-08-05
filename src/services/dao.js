const { mongo, ObjectId } = require("./mongo");
const Config = require("../config/config");

const DEFAULT_PAGE_SIZE = 100;

class Dao {
  constructor(collectionName, { uri = Config.mongodbUri, dbName = Config.mongodbName } = {}) {
    this.client = mongo(uri);
    this.db = this.client.db(dbName);
    this.coll = this.db.collection(collectionName);
  }

  find(filter = {}, { pageSize = DEFAULT_PAGE_SIZE, pageIndex } = {}, sort = {}, projection = {}) {
    return this._exec(() => this._find(filter, { projection }, sort, pageIndex * pageSize, pageSize));
  }

  findOne(filter = {}, projection = {}, sort = {}) {
    return this._exec(() => this._find(filter, { projection }, sort, 0, 1)).then((result) => result.length < 1 ? null : result[0]);
  }

  list(pageInfo) {
    return this.find(undefined, pageInfo);
  }

  get(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const { insertedId: id } = await this._exec(() => this.coll.insertOne(this._convertId({ ...data })));
    return { id, ...data };
  }

  async createMany(dataList) {
    const { insertedIds } = await this._exec(() => this.coll.insertMany(dataList.map((data) => this._convertId({ ...data }))));
    return dataList.map((data, i) => ({ id: insertedIds[i], ...data }));
  }

  async update(data) {
    await this._exec(() => {
      const { id, ...newData } = data;
      return this.coll.updateOne({ _id: id }, { $set: newData });
    });

    return await this.get(data.id);
  }

  async delete(id) {
    const data = await this.get(id);
    await this._exec(() => this.coll.deleteOne({ _id: id }));
    return data;
  }

  _convertId(object) {
    // eslint-disable-next-line no-prototype-builtins
    if (object.hasOwnProperty("_id")) {
      delete object.id;
      // eslint-disable-next-line no-prototype-builtins
    } else if (object.hasOwnProperty("id")) {
      object._id = new ObjectId(object.id);
      delete object.id;
    }

    return object;
  }

  _convertToId(obj) {
    let result;
    if (obj.constructor === Array) {
      result = obj.map((element) => {
        // eslint-disable-next-line no-prototype-builtins
        if (element.hasOwnProperty("_id")) {
          element.id = element._id;
          delete element._id;
        }
        return element;
      });
    } else {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty("_id")) {
        obj.id = obj._id;
        delete obj._id;
      }
      result = obj;
    }
    return result;
  }

  _find(filter, options, sort, skip, limit) {
    return this.coll
      .find(this._convertId(filter), options)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()
      .then(this._convertToId);
  }

  async _exec(callback) {
    // Connect the client to the server	(optional starting in v4.7)
    try {
      await this.client.connect();
    } catch (e) {
      console.error("Cannot connect to mongo. Check https://cloud.mongodb.com/v2/648433fc6d28c3603ac3dd22#/clusters if dtb is running.", e);
      throw e;
    }

    try {
      // Send a ping to confirm a successful connection
      return await callback();
    } finally {
      // Ensures that the client will close when you finish/error
      await this.client.close();
    }
  }
}

module.exports = Dao;
