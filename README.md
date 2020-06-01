[![](https://img.shields.io/npm/v/@whi/knex-orm/latest?style=flat-square)](http://npmjs.com/package/@whi/knex-orm)

# Knex ORM
This module helps manage table relationships, complex entity structuring, and common data procedures
such as pagination.

![](https://img.shields.io/github/issues-raw/mjbrisebois/knex-orm?style=flat-square)
![](https://img.shields.io/github/issues-closed-raw/mjbrisebois/knex-orm?style=flat-square)
![](https://img.shields.io/github/issues-pr-raw/mjbrisebois/knex-orm?style=flat-square)

## Overview
Data relationships between tables can be quite cumbersome especially to developers less experienced
in database design.  Although it seems difficult to manage complex relationships, there is a simple
underlying recursive nature that can be managed predictable.  This ORM avoids the most common issues
by implementing safe, efficient, and flexible methods for handling intricate patterns.

### Features
- Simplifies table joining syntax
- Automatically avoids conflicting column names
- Uses an efficient flexible pagination query structure


## Usage

### Install
```bash
npm i @whi/knex-orm
```

### Example Configuration

#### Context (sqlite3)

```sql
CREATE TABLE IF NOT EXISTS users (
       id               integer PRIMARY KEY AUTOINCREMENT,
       email            varchar NOT NULL UNIQUE,
       first_name       varchar,
       last_name        varchar,
       created          timestamp DEFAULT CURRENT_TIMESTAMP
);
```

#### Initialization
```javascript
const { Table } = require('@whi/knex-orm');

const Users = new Table( "users", database, {
    "alias": "u",

    "columns": [
        "id",
        "email",
        "first_name",
        "last_name",
        "created",
    ],

    "defaults": {
        "order_by": ["u.created", "desc"],
    },

    restruct ( row ) {
        return {
            "id":               row.u_id,
            "email":            row.u_email,
            "name": {
                "first":        row.u_first_name,
                "last":         row.u_last_name,
                "full":         `${row.u_first_name} ${row.u_last_name}`,
            },
            "created":          new Date( row.u_created ),
        };
    },
});
```

### `Table` Class Reference

#### `constructor( <table name> : string, <client> : knex, <config> : object )`
Initialize a new table configuration.

`config`
- Required
  - `.alias : string` - Table alias used in query (eg. `${table name} as ${alias}`)
  - `.columns : array` - List of columns in this table
  - `.restruct : function` - A callback for turning a single `row` of data into a structure object.
- Optional
  - `.joins : function` - A function that should return an array of Join Configurations.
  - `.defaults : object` - Set default valuess for certain optiional parameters
    - `.order_by : tuple(2)` - An array with 2 values used for `knex.orderBy` (eg. `[ <column name>, asc|desc ]`).
  - `... : object` - Any additional methods.
    - `[method] : function` - a function where `method` does not override reserved class properties.

#### `this.table`
A special `getter` method that always returns a fresh `knex( <table name> )` instance.

#### `this.base( <options> = {} )`

`options`
- `.client : knex` - Knex client to be used for query construction (default to `<client>`).
- `.from : knex.from input` - Custom input for `knex.from( from )` (defaults to `<table name> as <alias>`).
- `.order_by : tuple(2)` - Custom input for `knex.orderBy( ... )` (defaults to `<defaults.order_by>`).

#### `this.join( <related column name>, <foreign column name>, <type> = "left" )`
Method that creates and returns a Join Configuration using given arguments.

**TODO:** Implement `<type>`

Example
```javascript
{
    "table": "<table name> as <alias>",
    "base_col": "<alias>.<related column name>",
    "foreign_col": "<foreign column name>",
    "columns": Object.assign({}, <this.columns> ),
}
```

#### `this.paginate( <where> : knex.where input, <options> = {} )`
Automated pagination.

`options`
- `.page : number` - Desired page data (defaults to `1`)
- `.size : number` - Per page size (defaults to `25`)
- `.order_by : tuple(2)` - Order by configuration (defaults to `<defaults.order_by>`).
- `.debug : boolean` - Turn on SQL logging (defaults to `false`)

Example return value
```javascript
{
    "start":            0,
    "limit":            25,
    "total":            3832,
    "remaining":        3807,
    "pages": {
        "current":      1,
        "first":        true,
        "last":         false,
        "total":        154,
        "remaining":    153,
    },
    "data" : [ ... ],
}
```

#### `this.queryToDebugString( <query> : knex )`
Returns the query SQL as a pretty printed string for debugging.
