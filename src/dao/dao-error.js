class DaoError extends Error {
  constructor(msg, code, ...args) {
    super(msg, ...args);
    if (code) this.code = "oc_mongo/dao/" + code;
  }
}

module.exports = DaoError;
