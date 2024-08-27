# App Server

- based on `mongodb`

## API

### Dao

#### constructor(collectionName, { uri = process.env.MONGODB_URI } = {})

| Param            | Desc                                |
|------------------|-------------------------------------|
| `collectionName` | Name of the collection in database. |    
| `uri`            | Uri of database in mongoDB          | 

```
const OcMongo = require("oc_mongo");

class UserDao extends OcMongo.Dao {
  constructor() {
    super("user"); // name of the collection
  }

  createIndexes() {
    super.createIndex({ email: 1, password: 1 }, { unique: true });
    super.createIndex({ name: 1 });
  }
}
```

## ENV

- add .env file next to package.json and configure your App:

| Param       | Desc                       |
|-------------|----------------------------|
| MONGODB_URI | Uri of the mongo database. |

## Publishing to npmjs
`npm publish --access public`