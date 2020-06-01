const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});


const { FunctionIO,
	DatabaseIO }			= require('@whi/skeptic');
const { ItemNotFoundError }		= require('@whi/serious-error-types');
const sql_formatter			= require('sql-formatter');


class Table {
    constructor ( table_name, client, { alias = null, columns, restruct, joins = null, defaults = {}, ...methods }) {
	this.name			= table_name;
	this.alias			= alias;
	this.table_alias		= `${this.name} as ${this.alias}`;

	this.client			= client;

	this.columns			= columns.reduce( (cols, key) => {
	    return Object.assign(cols, {
		[`${this.alias}_${key}`]: `${this.alias}.${key}`,
	    });
	}, {});
	this.joins			= joins;
	this.restruct			= restruct;

	if ( defaults.order_by ) {
	    if ( ! columns.some( col => defaults.order_by[0].endsWith(col) ) )
		throw new Error(`Default 'order by' (${defaults.order_by[0]}) column is not in column list: ${columns.join(', ')}`);
	    if ( ! ["asc", "desc"].includes( defaults.order_by[1].toLowerCase() ) )
		throw new Error(`Invalid orientation for default 'order by': ${defaults.order_by[1]}, must be either 'asc' or 'desc'`);
	}
	this.defaults			= defaults;

	for ( let k of Object.keys(methods) ) {
	    if ( this[k] !== undefined )
		throw new Error(`${this.constructor.name} class '${this.name}' method '${k}' already defined with type ${typeof this[k]}`);
	    this[k]			= methods[k];
	}
    }

    get table () {
	return this.client( this.name );
    }

    queryToDebugString ( query ) {
	return sql_formatter.format( query.toString(), { indent: "    " });
    }

    base ({ client = this.client, from = this.table_alias, order_by = this.defaults.order_by } = {}) {
	const base			= client.from( from );

	base.column( this.columns );

	if ( this.joins !== null ) {
	    for ( let join of this.joins() ) {
		base.column( join.columns );
		if( join.custom )
		    base.leftJoin( join.table, join.custom );
		else
		    base.leftJoin( join.table, join.base_col, `${this.alias}.${join.foreign_col}` );
	    }
	}
	try {
	    // log.silly("Base query for '%s'\n\n%s\n", () => [ this.name, this.queryToDebugString( base ) ] );
	} catch ( err ) {
	    log.warn("Failed to format query for logs: %s", String(err) );
	}

	if ( order_by )
	    base.orderBy( order_by[0], order_by[1] );

	return base;
    }

    join ( local_col, foreign_col ) {
	const join_config		= {
	    "table":		this.table_alias,
	    "columns":		Object.assign({}, this.columns ),
	};
	if ( typeof local_col === "function" )
	    return Object.assign( join_config, {
		"custom":		local_col,
	    });
	else
	    return Object.assign( join_config, {
		"base_col":		`${this.alias}.${local_col}`,
		"foreign_col":		foreign_col,
	    });
    }

    async paginate ( where, { page = 1, size = 25, debug = false, order_by = this.defaults.order_by } = {}) {
	FunctionIO.validateArguments(arguments, [
	    FunctionIO.requiredArgumentType("object|function", "Where clause"),
	    FunctionIO.optionalArgumentObject({
		"page":		FunctionIO.optionalArgumentType("number", "Page number"),
		"size":		FunctionIO.optionalArgumentType("number", "Result size"),
		"debug":	FunctionIO.optionalArgumentType("boolean", "Debug flag"),
	    }),
	]);

	if ( page < 1 )
	    throw new Error(`Page cannot be less than 1: received ${page}`);

	const start			= (page-1) * size;
	const limit			= size;

	if ( limit < 1 )
	    throw new Error(`Limit cannot be less than 1: limit ${limit} offset ${start}`);

	// Virtual table applies the where clause and limit/offset before base() applies column
	// aliases and joins.
	const vtable			= this.client.with( this.alias , (qb) => {
	    qb.from( this.name ).where( where );
	})
	      .select("*", (sq) => {
		  sq.count("*").from( this.alias ).as("total_results");
	      })
	      .from( this.alias )
	      .limit( limit )
	      .offset( start )
	      .as( this.alias );

	if ( order_by )
	    vtable.orderBy( order_by[0], order_by[1] );

	const query			= this.base({
	    "client":	this.client,
	    "from":	vtable,
	});
	query.column("total_results");

	if ( debug === true )
	    log.silly("QUERY:\n\n%s\n", this.queryToDebugString( query ) );

	const start_time		= Date.now();
	let rows;
	try {
	    rows			= await DatabaseIO.queryCompleted( query );
	} catch ( err ) {
	    debug || log.error("QUERY:\n\n%s\n", this.queryToDebugString( query ) );
	    throw err;
	}
	const end_time			= Date.now();
	log.silly("Query stats: duration %dms", end_time - start_time );

	if ( rows.length === 0 && page > 1 )
	    throw new ItemNotFoundError( query );

	const data			= rows.map( row => this.restruct( row ) );
	const total_results		= rows[0] ? rows[0].total_results : 0;
	const total_pages		= Math.ceil( total_results / limit );

	return {
	    "start":		start,
	    "limit":		limit,
	    "total":		total_results,
	    "remaining":	total_results - start - data.length,
	    "pages": {
		"current":	page,
		"first":	page === 1,
		"last":		page === total_pages,
		"total":	total_pages,
		"remaining":	Math.max( total_pages - page, 0 ),
	    },
	    data,
	};
    }
}

module.exports				= {
    Table,
};
