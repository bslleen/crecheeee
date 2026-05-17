/**
 * @file db.js
 * @module src/config/db
 * @description MySQL connection pool factory for the IDMS application.
 *
 * Uses `mysql2/promise` to provide a single, shared pool instance across all
 * modules. Connection pooling prevents the overhead of opening a new TCP
 * connection per request and automatically recycles idle connections.
 *
 * The pool is initialised once at import time and exported as a singleton so
 * that every module that does `import pool from '../config/db.js'` shares the
 * same underlying connection pool — consistent with the standard Node.js
 * singleton pattern for database resources.
 */

import mysql from 'mysql2/promise';

// ---------------------------------------------------------------------------
// Read connection parameters from environment variables.
// All values default to the local development profile specified in the SPMP.
// ---------------------------------------------------------------------------
// Support both local .env names and Railway's auto-injected MySQL plugin names.
const {
  DB_HOST            = process.env.MYSQLHOST     || 'localhost',
  DB_PORT            = process.env.MYSQLPORT     || '3306',
  DB_USER            = process.env.MYSQLUSER     || 'root',
  DB_PASSWORD        = process.env.MYSQLPASSWORD || '12345@Password',
  DB_NAME            = process.env.MYSQLDATABASE || 'idms_db',
  DB_CONNECTION_LIMIT = '10',
} = process.env;

/**
 * Shared MySQL 8.x connection pool.
 *
 * Configuration notes:
 *  - `waitForConnections: true`  — queue requests when all connections are
 *    busy rather than immediately throwing an error.
 *  - `connectionLimit`           — maximum number of simultaneous connections.
 *    Tune this based on MySQL's `max_connections` and expected concurrency.
 *  - `queueLimit: 0`             — unlimited queue depth (requests wait
 *    indefinitely). Set a positive integer in high-throughput scenarios.
 *  - `timezone: 'Z'`             — store and retrieve all DATETIME values in
 *    UTC, preventing timezone-shift bugs between the application server and DB.
 *  - `namedPlaceholders: true`   — allows `:name` style placeholders in
 *    queries, which is more readable than positional `?` for complex DML.
 *
 * @type {mysql.Pool}
 */
const pool = mysql.createPool({
  host:             DB_HOST,
  port:             Number(DB_PORT),
  user:             DB_USER,
  password:         DB_PASSWORD,
  database:         DB_NAME,
  connectionLimit:  Number(DB_CONNECTION_LIMIT),
  waitForConnections: true,
  queueLimit:       0,
  timezone:         'Z',
  namedPlaceholders: true,
});

// ---------------------------------------------------------------------------
// Connectivity smoke-test executed once at startup.
// Acquires one connection, sends a lightweight ping, then releases it back
// to the pool. If this fails the process exits immediately — an uninitialised
// database connection renders the entire application non-functional.
// ---------------------------------------------------------------------------
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.info(
      `[DB] Pool connected — ${DB_NAME}@${DB_HOST}:${DB_PORT} ` +
      `(limit: ${DB_CONNECTION_LIMIT} connections)`
    );
  } catch (err) {
    console.error('[DB] FATAL — Unable to connect to MySQL:', err.message);
    process.exit(1);   // Non-zero exit signals failure to process managers (PM2, Docker, etc.)
  }
})();

export default pool;
