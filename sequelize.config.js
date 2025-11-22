// noinspection DuplicatedCode

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root-pass',
    database: process.env.DB_NAME || 'walk',
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT ? (process.env.DB_DIALECT) : 'mysql',
    port: parseInt(process.env.DB_PORT || '3306'),
    ...(process.env.DB_SSL && process.env.DB_SSL.toLocaleLowerCase() === 'true' && {
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
        },
      },
      port: parseInt(process.env.DB_PORT || '3306')
    }),
    logging: process.env?.DB_LOGGING?.toLocaleLowerCase() === 'true',
    benchmark: process.env?.DB_BENCHMARK?.toLocaleLowerCase() === 'true',
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root-pass',
    database: process.env.DB_NAME || 'walk',
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT ? (process.env.DB_DIALECT) : 'mysql',
    port: parseInt(process.env.DB_PORT || '3306'),
    ...(process.env.DB_SSL && process.env.DB_SSL.toLocaleLowerCase() === 'true' && {
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
        },
      },
      port: parseInt(process.env.DB_PORT || '3306')
    }),
    logging: process.env?.DB_LOGGING?.toLocaleLowerCase() === 'true',
    benchmark: process.env?.DB_BENCHMARK?.toLocaleLowerCase() === 'true',
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root-pass',
    database: process.env.DB_NAME || 'walk',
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT ? (process.env.DB_DIALECT) : 'mysql',
    port: parseInt(process.env.DB_PORT || '3306'),
    ...(process.env.DB_SSL && process.env.DB_SSL.toLocaleLowerCase() === 'true' && {
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
        },
      },
      port: parseInt(process.env.DB_PORT || '3306')
    }),
    logging: process.env?.DB_LOGGING?.toLocaleLowerCase() === 'true',
    benchmark: process.env?.DB_BENCHMARK?.toLocaleLowerCase() === 'true',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
