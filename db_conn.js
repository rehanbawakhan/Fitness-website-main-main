const mysql = require('mysql2');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root1';
const DB_NAME = process.env.DB_NAME || 'fit';

// Create connection
const con = mysql.createConnection({
  host: DB_HOST,        // Database host, usually localhost
  user: DB_USER,        // MySQL user
  password: DB_PASSWORD,
  database: DB_NAME     // Database name
});

// Connect to MySQL
con.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    return;
  }
  console.log(`Connected to MySQL Database '${DB_NAME}' successfully!`);
});

// Export the connection for use in other files
module.exports = con;
