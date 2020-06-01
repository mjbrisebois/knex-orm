const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const crypto				= require('crypto');
const expect				= require('chai').expect;
const knex				= require('knex');
const { struct }			= require('superstruct');

const { Table }				= require('../../src/index.js');

const database				= knex({
    client: 'sqlite3',
    connection: {
	filename: path.join( __dirname, "../testing.sqlite" ),
    },
    useNullAsDefault: true,
});

const User = struct({
    "id":			"number",
    "email":			"string",
    "name": {
	"first":		"string",
	"last":			"string",
	"full":			"string",
    },
    "created":			"date",
});


function basic_tests () {
    it("should build base query", async () => {
	const orm			= new Table( "users", database, {
	    "alias":			"u",

	    "columns": [
		"id",
		"email",
		"first_name",
		"last_name",
		"created",
	    ],

	    "defaults": {
		"order_by":			["u.created", "desc"],
	    },

	    restruct ( row ) {
		return {
		    "id":		row.u_id,
		    "email":		row.u_email,
		    "name": {
			"first":	row.u_first_name,
			"last":		row.u_last_name,
			"full":		`${row.u_first_name} ${row.u_last_name}`,
		    },
		    "created":		new Date( row.u_created ),
		};
	    },
	});

	let random			= crypto.randomBytes(9).toString("base64");
	let email			= `${random}@example.com`;
	const ids			= await orm.table.insert({
	    email,
	    "first_name":	"Testing",
	    "last_name":	"Example",
	});
	expect( ids			).to.have.length( 1 );
	const id			= ids[0];

	const rows			= await orm.base()
	      .where("id", id );
	expect( rows			).to.have.length( 1 );

	const user			= orm.restruct( rows[0] );
	User( user );
    });
}

describe("Knex ORM", () => {

    after(() => {
	database.destroy();
    });

    describe("Basic", basic_tests );

});
