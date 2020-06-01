CREATE TABLE IF NOT EXISTS users (
       id		integer PRIMARY KEY AUTOINCREMENT,
       email		varchar NOT NULL UNIQUE,
       first_name	varchar,
       last_name	varchar,
       created		timestamp DEFAULT CURRENT_TIMESTAMP
);
