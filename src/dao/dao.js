const { mongo, ObjectId } = require("../helpers/mongo");
const Config = require("../config/config");
const DaoError = require("./dao-error");

const DEFAULT_PAGE_SIZE = 100;

function convertId(object) {
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

function convertToId(obj) {
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

function createData(data) {
  const cts = new Date().toISOString();
  return {
    ...data,
    sys: {
      cts,
      mts: cts,
    }
  };
}

function updateData(data) {
  const mts = new Date().toISOString();
  return {
    ...data,
    sys: {
      ...data.sys,
      mts,
    }
  };
}

class Dao {
  constructor(collectionName, { uri = Config.mongodbUri } = {}) {
    this.uri = uri;
    this.client = mongo(uri);
    this.db = this.client.db();
    this.coll = this.db.collection(collectionName);

    this._connectionsMap = {};

    this.createIndexes?.();
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
    if (data.sys) throw new DaoError("Key 'sys' is reserved in each dao object " + JSON.stringify(data), "create/invalidSys");

    const newData = createData(data);
    const { insertedId: id } = await this._exec(() => this.coll.insertOne(convertId(newData)));
    return { id, ...newData };
  }

  async createMany(dataList) {
    const newDataList = dataList.map((data) => convertId(createData(data)));
    const { insertedIds } = await this._exec(() => this.coll.insertMany(newDataList));
    return newDataList.map((data, i) => ({ id: insertedIds[i], ...data }));
  }

  async update(data) {
    const { id, ...restData } = data;
    const newData = updateData(restData);

    await this._exec(() => {
      return this.coll.updateOne({ _id: id }, { $set: newData });
    });

    return { id, ...newData };
  }

  async delete(id) {
    const data = await this.get(id);
    await this._exec(() => this.coll.deleteOne({ _id: id }));
    return data;
  }

  _find(filter, options, sort, skip, limit) {
    return this.coll
      .find(convertId(filter), options)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()
      .then(convertToId);
  }

  async _exec(callback) {
    try {
      this._connectionsMap[this.uri] ??= await this.client.connect();
    } catch (e) {
      console.error("Cannot connect to mongo. Check https://cloud.mongodb.com/v2/648433fc6d28c3603ac3dd22#/clusters if dtb is running.", e);
      throw e;
    }

    return await callback();
  }
}

module.exports = Dao;
