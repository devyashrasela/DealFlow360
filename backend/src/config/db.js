import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const rawDbUrl = process.env.DATABASE_URL || '';
const dbUrl = rawDbUrl.replace('?ssl-mode=REQUIRED', '');
const isSqlite = process.env.DB_DIALECT === 'sqlite' || (!process.env.DATABASE_URL && process.env.DB_STORAGE);

let sequelize;

if (isSqlite) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
  });
} else {
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

export default sequelize;
