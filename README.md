# @setitch/nest-sequelize-db

Utilities for using `sequelize-typescript` with NestJS: a global database module, reusable entity and service base classes, configuration storage, and Umzug migration helpers.

## Requirements

- Node.js 18 or newer
- NestJS 9 or newer
- `@nestjs/sequelize`, `sequelize`, and `sequelize-typescript`
- A Sequelize dialect driver, such as `pg`, `mysql2`, `sqlite3`, `tedious`, or `oracledb`

## Installation

```bash
npm install @setitch/nest-sequelize-db @nestjs/sequelize sequelize sequelize-typescript
```

Install the driver for the database used by your application. For PostgreSQL:

```bash
npm install pg
```

For local SQLite development or tests:

```bash
npm install sqlite3
```

`ConfigurationDbService` uses Nest event and schedule decorators, so applications using it also need:

```bash
npm install @nestjs/event-emitter @nestjs/schedule
```

## Quick start

Register `DbModule` once in the application root. It is global, so feature modules can inject exported providers without re-importing it.

```ts
import { Module } from '@nestjs/common';
import { DbModule } from '@setitch/nest-sequelize-db';

@Module({
  imports: [
    DbModule.forRoot({
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'app',
      password: 'secret',
      database: 'app_db',
      logging: false,
    }),
  ],
})
export class AppModule {}
```

The same options can be supplied with environment variables:

```dotenv
DB_DIALECT=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=app
DB_PASS=secret
DB_DATABASE=app_db
DB_SSL=false
DB_LOGGING=false
DB_BENCHMARK=false
GLOBAL_SEARCH_LIMIT=400
```

When an explicit option is supplied to `DbModule.forRoot()`, it takes precedence over its corresponding environment variable.

## Define an entity

Extend `AbstractEntity` to add `createdBy`, `updatedBy`, `deletedBy`, `unDeletedAt`, and `unDeletedBy` audit columns. Sequelize provides the usual `id`, `createdAt`, `updatedAt`, and optional `deletedAt` columns according to the table settings.

```ts
import { Column, DataType, Table } from 'sequelize-typescript';
import { AbstractEntity } from '@setitch/nest-sequelize-db';

@Table({
  tableName: 'users',
  paranoid: true,
})
export class UserEntity extends AbstractEntity {
  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.STRING)
  email!: string;
}
```

## Define a database service

Extend `AbstractDbService` to receive common CRUD operations, safe pagination, transaction helpers, include defaults, and allowed-sort validation.

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AbstractDbService } from '@setitch/nest-sequelize-db';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersDbService extends AbstractDbService<UserEntity> {
  protected allowedSortingColumns: Array<keyof UserEntity & string> = [
    'id',
    'name',
    'createdAt',
  ];

  protected defaultOrder = [['createdAt', 'DESC']] as const;

  constructor(
    @InjectModel(UserEntity)
    model: typeof UserEntity,
  ) {
    super(model);
  }
}
```

Useful methods include:

- `create(attributes, options)`
- `getById(id, options)`, `getByIds(ids, options)`, and `getAllByIds(ids, options)`
- `deleteById(id, options)` and `deleteByIds(ids, options)`
- `findAll(params, options)` and `find(params, options)`
- `beginTransaction()` and `executeTransaction(callback, transaction?)`
- `getLimitAndPage(limit?, page?)`
- `prepareOrFieldQueryILike(query, separator?)`, which uses `LIKE` outside PostgreSQL

`findAll()` and `find()` validate array-based ordering against `allowedSortingColumns`. Configure that list in each concrete service before accepting sort fields from requests.

## Register a feature module

Use `DbModule.forFeature()` to register models and services. Registered models are added to the Sequelize connection during application bootstrap and synchronized with `alter: true` outside tests.

```ts
import { Module } from '@nestjs/common';
import { DbModule } from '@setitch/nest-sequelize-db';
import { UserEntity } from './user.entity';
import { UsersDbService } from './users-db.service';

@Module({
  imports: [
    DbModule.forFeature({
      models: [UserEntity],
      services: [UsersDbService],
      migrationsPath: __dirname + '/migrations',
      moduleName: 'UsersModule',
    }),
  ],
  exports: [UsersDbService],
})
export class UsersModule {}
```

`moduleName` is optional but recommended because it identifies the source module in migration logs.

## Multiple database connections

Set `connectionName` on the root module, then inject the named Sequelize connection using Nest’s standard `@InjectConnection()` API. Named connection tokens also use `SEQUELIZE_<UPPERCASE_NAME>`.

```ts
DbModule.forRoot({
  connectionName: 'analytics',
  dialect: 'postgres',
  host: 'localhost',
  database: 'analytics',
  username: 'app',
  password: 'secret',
});
```

## Migrations

The module discovers `.ts` and `.js` files in each `migrationsPath` passed to `forFeature()`, then applies pending migrations with Umzug for non-SQLite connections. Export a `migration` object with `up` and `down` methods:

```ts
import { DataType } from 'sequelize-typescript';
import type { MigrationBaseType } from '@setitch/nest-sequelize-db';

export const migration: MigrationBaseType = {
  async up(queryInterface) {
    await queryInterface.createTable('roles', {
      id: {
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataType.STRING,
        allowNull: false,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
```

For TypeScript migrations at runtime, install `ts-node` in the consuming application. In a compiled Nest application, pass the path to the compiled migration files.

`MigrationHelperClass.from(queryInterface)` provides table and column inspection plus helpers to add only missing columns.

```ts
import { DataType } from 'sequelize-typescript';
import { MigrationHelperClass } from '@setitch/nest-sequelize-db';

const helper = await MigrationHelperClass.from(queryInterface);
await helper.prepare('users');
await helper.addMissingColumns('users', {
  displayName: { type: DataType.STRING, allowNull: true },
});
```

## Configuration storage

`ConfigurationEntity` stores JSON values by string key. Register it and a provider for `ConfigurationDbService`:

```ts
import { Module } from '@nestjs/common';
import {
  ConfigurationDbService,
  ConfigurationEntity,
  DbModule,
} from '@setitch/nest-sequelize-db';

@Module({
  imports: [
    DbModule.forFeature({
      models: [ConfigurationEntity],
      modelProviders: [
        {
          provide: 'DB_REPOSITORY-CONFIGURATION',
          useValue: ConfigurationEntity,
        },
      ],
      services: [ConfigurationDbService],
    }),
  ],
})
export class ConfigurationModule {}
```

Use it from an injected service:

```ts
await configurationDbService.set('mail.host', 'smtp.example.com');
const host = await configurationDbService.get<string>('mail.host');
const mail = await configurationDbService.getWildcard<Record<string, unknown>>('mail.');
```

The service caches reads and emits `configuration.created`, `configuration.set`, `configuration.updated`, `configuration.modified`, and `configuration.read` events. It refreshes changed values every minute. Emit `configuration.reload` or `configuration.refresh` to trigger a refresh through Nest’s event emitter.

## Testing

This package includes unit tests using an in-memory SQLite database. Run them with:

```bash
yarn test
```

Run coverage with:

```bash
yarn test:cov
```

## Publishing

Before the first release:

```bash
yarn install
yarn test
yarn build
npm login
npm publish --access public
```

Use `npm pack --dry-run` to inspect the exact tarball contents without publishing. The `prepack` script builds `dist` automatically before `npm pack` and `npm publish`.

## License

MIT
