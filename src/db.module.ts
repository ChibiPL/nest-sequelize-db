import { DynamicModule, Global, Logger, Module, OnApplicationBootstrap, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectConnection, SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { join } from 'node:path';
import { ModelCtor, Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize/types';
import { MigrationError, SequelizeStorage, Umzug } from 'umzug';
import { MigrationModuleType, migrationsLanguageSpecificHelp } from './types/migration.types';

const UmZugLogger: Logger & {
  info(message: any, context?: string): void;
  info(message: any, ...optionalParams: [...any, string?]): void;
} = new Logger('UmZug') as any;
(UmZugLogger as any).info = UmZugLogger.log;

// Migration path with associated module name
interface MigrationPathInfo {
  path: string;
  moduleName: string;
}

// Global registry for models, services, and migrations
export class DbModuleRegistry {
  private static models: ModelCtor[] = [];

  private static services: Provider[] = [];

  private static modelProviders: Provider[] = [];

  private static migrationPaths: MigrationPathInfo[] = [];

  static registerModels(models: ModelCtor[]): void {
    const modelNames = models.map(m => (m as any).name || m.tableName || 'unknown').join(', ');
    this.models.push(...models);
  }

  static registerServices(services: Provider[]): void {
    this.services.push(...services);
  }

  static registerModelProviders(providers: Provider[]): void {
    this.modelProviders.push(...providers);
  }

  static registerMigrationPath(path: string, moduleName: string): void {
    this.migrationPaths.push({ path, moduleName });
  }

  static getModels(): ModelCtor[] {
    return [...this.models];
  }

  static getServices(): Provider[] {
    return [...this.services];
  }

  static getModelProviders(): Provider[] {
    return [...this.modelProviders];
  }

  static getMigrationPaths(): MigrationPathInfo[] {
    return [...this.migrationPaths];
  }

  static clear(): void {
    this.models = [];
    this.services = [];
    this.modelProviders = [];
    this.migrationPaths = [];
  }
}

export interface DbModuleFeatureOptions {
  models?: ModelCtor[];
  services?: Provider[];
  modelProviders?: Provider[];
  migrationsPath?: string;
  moduleName?: string; // Optional module name for migration tracking
}

export interface DbModuleRootOptions {
  connectionName?: string; // Optional connection name for multiple connections
  dialect?: Dialect;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  logging?: boolean;
  benchmark?: boolean;
  pool?: {
    max?: number;
    min?: number;
    idle?: number;
    acquire?: number;
  };
}

@Global()
@Module({})
export class DbModule implements OnApplicationBootstrap {
  protected readonly logger = new Logger(DbModule.name);

  private static migrationExecuted = false;
  
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    private moduleRef: ModuleRef,
  ) {}

  static forRoot(options?: DbModuleRootOptions): DynamicModule {
    const getSequelizeOptions = (): SequelizeModuleOptions => {
      const connectionName = options?.connectionName;
      const baseOptions: SequelizeModuleOptions = {
        dialect: options?.dialect || (process.env.DB_DIALECT ? (process.env.DB_DIALECT as Dialect) : 'sqlite'),
        host: options?.host || process.env.DB_HOST || '127.0.0.1',
        port: options?.port || Number.parseInt(process.env.DB_PORT || '3306'),
        username: options?.username || process.env.DB_USER || 'root',
        password: options?.password || process.env.DB_PASS || 'root-pass',
        database: options?.database || process.env.DB_DATABASE || 'db-schema',
        models: [],
        autoLoadModels: false,
        synchronize: false,
        logging: options?.logging ?? (process.env?.DB_LOGGING?.toLocaleLowerCase() === 'true'),
        benchmark: options?.benchmark ?? (process.env?.DB_BENCHMARK?.toLocaleLowerCase() === 'true'),
        pool: {
          max: options?.pool?.max ?? 16,
          min: options?.pool?.min ?? 1,
          idle: options?.pool?.idle ?? 30_000,
          acquire: options?.pool?.acquire ?? 10_000,
        },
      };

      // Add connection name if provided (for multiple connections)
      if (connectionName) {
        (baseOptions as any).name = connectionName;
      }

      const sslEnabled = options?.ssl ?? (process.env.DB_SSL && process.env.DB_SSL.toLocaleLowerCase() === 'true');
      if (sslEnabled) {
        baseOptions.ssl = true;
        baseOptions.dialectOptions = {
          ssl: {
            require: true,
          },
          decimalNumbers: true,
        };
      } else {
        baseOptions.dialectOptions = {
          decimalNumbers: true,
        };
      }

      return baseOptions;
    };

    const sequelizeOptions = getSequelizeOptions();
    const connectionName = options?.connectionName || 'default';
    const sequelizeToken = connectionName === 'default' ? Sequelize : `SEQUELIZE_${connectionName.toUpperCase()}`;

    // For test environment, use direct Sequelize instantiation
    if (process.env.node_env === 'test') {
      const testDb = (process.env?.DB_TEST || 'memory')?.toLocaleLowerCase() === 'memory' ? ':memory:' : process.env.DB_TEST;
      const testSequelize = new Sequelize(`sqlite:${testDb}`);
      
      // Add registered models (sync will happen in onApplicationBootstrap)
      const allModels = DbModuleRegistry.getModels();
      if (allModels.length > 0) {
        testSequelize.addModels(allModels);
      }
      
      return {
        module: DbModule,
        imports: [],
        providers: [
          {
            provide: Sequelize,
            useValue: testSequelize,
          },
          // Provide SEQUELIZE token for backward compatibility
          {
            provide: connectionName === 'default' ? 'SEQUELIZE' : sequelizeToken,
            useFactory: async (sequelize: Sequelize) => {
              return sequelize;
            },
            inject: [Sequelize],
          },
        ],
        exports: [
          Sequelize,
          connectionName === 'default' ? 'SEQUELIZE' : sequelizeToken,
          SequelizeModule,
          ...DbModuleRegistry.getModelProviders(),
          ...DbModuleRegistry.getServices(),
        ],
      };
    }

    return {
      module: DbModule,
      imports: [
        SequelizeModule.forRootAsync({
          useFactory: async () => {
            // Models will be added in onApplicationBootstrap after all modules are loaded
            return sequelizeOptions;
          },
        }),
      ],
      providers: [
        // Provide SEQUELIZE token for backward compatibility (default connection)
        // For named connections, use SEQUELIZE_<NAME>
        {
          provide: connectionName === 'default' ? 'SEQUELIZE' : sequelizeToken,
          useFactory: async (sequelize: Sequelize) => {
            return sequelize;
          },
          inject: [Sequelize],
        },
        // Note: Models and services registered via forFeature() will be added in onApplicationBootstrap
        // after all modules are loaded, so we don't add them here
      ],
      exports: [
        connectionName === 'default' ? 'SEQUELIZE' : sequelizeToken,
        SequelizeModule,
        // Export all registered model providers and services for global access
        ...DbModuleRegistry.getModelProviders(),
        ...DbModuleRegistry.getServices(),
      ],
    };
  }

  static forFeature(options: DbModuleFeatureOptions): DynamicModule {
    const { models = [], modelProviders = [], migrationsPath, moduleName } = options;

    console.log(`[DbModule.forFeature] Called with ${models.length} models`);
    if (models.length > 0) {
      const modelNames = models.map(m => (m as any).name || m.tableName || 'unknown').join(', ');
      console.log(`[DbModule.forFeature] Model names: ${modelNames}`);
    }

    // Register models, services, and providers
    if (models.length > 0) {
      DbModuleRegistry.registerModels(models);
    }
    if (modelProviders.length > 0) {
      DbModuleRegistry.registerModelProviders(modelProviders);
    }
    if (migrationsPath) {
      // Use provided moduleName or try to infer from call stack
      const inferredModuleName = moduleName || this.getCallingModuleName() || 'Unknown';
      DbModuleRegistry.registerMigrationPath(migrationsPath, inferredModuleName);
    }

    return {
      module: DbModule,
      imports: models.length > 0 ? [SequelizeModule.forFeature(models)] : [],
      providers: [
        ...modelProviders,
      ],
      exports: [
        SequelizeModule,
        ...modelProviders.map(p => (p as any).provide).filter(Boolean),
      ],
    };
  }
  
  async onApplicationBootstrap() {
    // Prevent multiple executions across all instances
    if (DbModule.migrationExecuted) {
      this.logger.warn('DbModule.onApplicationBootstrap already executed. Skipping duplicate initialization.');

      return;
    }
    DbModule.migrationExecuted = true;

    // Get models from registry (registered via forFeature)
    const registeredModels = DbModuleRegistry.getModels();
    
    // Log registered model names
    if (registeredModels.length > 0) {
      const registeredNames = registeredModels.map(m => (m as any).name || m.tableName || 'unknown').join(', ');
    }
    
    // Check what models are already in Sequelize (from SequelizeModule.forFeature)
    const existingModels = Object.values(this.sequelize.models);
    
    // CRITICAL: Add models from registry to sequelize-typescript instance via addModels()
    // SequelizeModule.forFeature() makes models available for DI but doesn't add them for syncing
    // We MUST call addModels() to ensure models are available for sync operations
    if (registeredModels.length > 0) {
      try {
        // Always add models - addModels() handles duplicates internally
        this.sequelize.addModels(registeredModels);
      } catch (err) {
        this.logger.error(`Error adding models: ${(err as Error).message}`);
        // Continue anyway - models might already be added
      }
    } else {
      this.logger.warn('No models found in registry. Make sure DbModule.forFeature() is called with models in your feature modules.');
    }
    
    // Get all models after processing (should include both forFeature and registry models)
    const allSequelizeModels = Object.values(this.sequelize.models);
    
    // Log all model names for debugging
    if (allSequelizeModels.length > 0) {
      const modelNames = allSequelizeModels.map(m => {
        const name = (m as any).name || (m as any).tableName || 'unknown';
        const tableName = (m as any).tableName || name;

        return `${name} (table: ${tableName})`;
      }).join(', ');
      // this.logger.verbose(`Models in Sequelize: ${modelNames}`);
    } else {
      this.logger.error('No models found in Sequelize instance after adding. This is a critical issue.');
      this.logger.error('Check that:');
      this.logger.error('1. Models are registered via DbModule.forFeature({ models: [...] })');
      this.logger.error('2. Models extend from AbstractEntity or use proper sequelize-typescript decorators');
      this.logger.error('3. Models are imported correctly in feature modules');
    }

    // Sync models - forced for tests, soft (alter) for other environments
    // This will sync ALL models in the Sequelize instance, including those from forFeature
    const isTest = process.env.node_env === 'test';
    this.logger.verbose(`Syncing models (isTest: ${isTest}, dialect: ${this.sequelize.getDialect()})`);
    
    try {
      if (isTest) {
        // Force sync in test mode (drops and recreates tables)
        await this.sequelize.sync({ force: true });
      } else {
        // Soft sync (alter: true) for other environments - adds missing columns/tables without dropping
        await this.sequelize.sync({ alter: true });
      }
      
      // Verify tables were created
      const tables = await this.sequelize.getQueryInterface().showAllTables();
      this.logger.verbose(`Sync completed. Database has ${tables.length} tables.`);
      // this.logger.verbose(`Sync completed. Database has ${tables.length} tables: ${tables.join(', ')}`);
      
      if (tables.length === 0 && allSequelizeModels.length > 0) {
        this.logger.error('Sync completed but no tables were created. This might indicate a problem with model definitions.');
      }
    } catch (err) {
      this.logger.error(`Error syncing models: ${(err as Error).message}`);
      this.logger.error(err);
      throw err;
    }
    
    try {
      await this.migrate();
    } catch (err) {
      if (err instanceof MigrationError) {
        (new Logger('DbModule - Migrations')).error(`${err?.message}`);
      } else {
        (new Logger('DbModule')).error(`Could not connect with database: ${(err as Error)?.message}`);
      }
      console.log(err);
      process.exit(1);
    }
    (new Logger('DbModule')).debug('Database Started');
  }
  
  protected async migrate() {
    const oldLogged = this.sequelize.options.logging;
    this.sequelize.options.logging = false;

    const connectionName = (this.sequelize.options as any).name || 'default';
    const database = this.sequelize.config.database || 'unknown';
    this.logger.verbose(`Migration check on: ${this.sequelize?.getDialect()} (connection: ${connectionName}, database: ${database})`);
    
    const registeredMigrationPaths = DbModuleRegistry.getMigrationPaths();
    if (registeredMigrationPaths.length > 0) {
      this.logger.verbose('Registered migration paths:');
      for (const { path, moduleName } of registeredMigrationPaths) {
        this.logger.verbose(`  - ${moduleName}: ${path}`);
      }
    }

    if (this.sequelize?.getDialect() !== 'sqlite') {
      require('ts-node/register');
      
      // Get all migration paths (base + registered)
      const baseMigrationsPath = join(__dirname, 'migrations');
      const allMigrationPaths = [
        { path: baseMigrationsPath, moduleName: 'DbModule (base)' },
        ...registeredMigrationPaths,
      ];

      // Collect all migration files from all paths with their module names
      const migrationFiles: Array<{ name: string; path: string; moduleName: string }> = [];
      
      for (const migrationPathInfo of allMigrationPaths) {
        try {
          const fs = require('node:fs');
          if (fs.existsSync(migrationPathInfo.path)) {
            const files = fs.readdirSync(migrationPathInfo.path);
            for (const file of files) {
              if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
                migrationFiles.push({
                  name: file,
                  path: join(migrationPathInfo.path, file),
                  moduleName: migrationPathInfo.moduleName,
                });
              }
            }
          }
        } catch (error) {
          // Path doesn't exist or can't be read, skip it
          console.warn(`Migration path not found or not readable: ${migrationPathInfo.path} (from ${migrationPathInfo.moduleName})`);
        }
      }

      // Create Umzug instance with custom migrations function
      const umzug = new Umzug({
        storage: new SequelizeStorage({ sequelize: this.sequelize }),
        context: this.sequelize.getQueryInterface(),
        migrations: async () => {
          const migrations = [];
          for (const file of migrationFiles) {
            const module: MigrationModuleType = (() => {
              try {
                return require(file.path);
              } catch (error) {
                if (error instanceof SyntaxError && file.path.endsWith('.ts')) {
                  error.message += '\n\n' + migrationsLanguageSpecificHelp['.ts'];
                }
                throw error;
              }
            })();
            
            migrations.push({
              name: file.name,
              path: file.path,
              up: async () => module.migration.up(this.sequelize.getQueryInterface()),
              down: async () => module.migration.down(this.sequelize.getQueryInterface()),
            });
          }

          return migrations;
        },
        logger: UmZugLogger,
      });
      
      umzug.debug.enabled = false;
      umzug.on('migrating', ev => {
        // Find which module this migration belongs to
        const migrationInfo = migrationFiles.find(f => f.path === ev.path || ev.name === f.name);
        const connectionName = (this.sequelize.options as any).name || 'default';
        this.logger.log(`Migrating: ${ev.name} [from ${migrationInfo?.moduleName || 'Unknown'}] (connection: ${connectionName})`);
      });

      await umzug.up();
    }

    this.sequelize.options.logging = oldLogged;
  }

  private static getCallingModuleName(): string | undefined {
    try {
      const stack = new Error().stack;
      if (!stack) return undefined;
      
      const stackLines = stack.split('\n');
      // Look for the module file in the stack (usually 3-4 levels up from this method)
      for (let i = 3; i < Math.min(stackLines.length, 10); i++) {
        const line = stackLines[i];
        // Try to extract module name from file path
        const match = line.match(/([^\/\\]+)\.module\.ts/);
        if (match) {
          return match[1];
        }
      }
    } catch {
      // Ignore errors in stack trace parsing
    }

    return undefined;
  }
}
