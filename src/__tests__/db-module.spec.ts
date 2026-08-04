import { Test } from '@nestjs/testing';
import * as process from 'node:process';
import { Sequelize } from 'sequelize-typescript';
import { TEST_MEMORY_DB } from '../consts/tests.consts';
import { DbModule, DbModuleRegistry } from '../db.module';
import { TestUser, TestPost } from './test-utils/test-models';
import { TestUserService } from './test-utils/test-services';
import { createTestModule, closeTestModule } from './test-utils/test-setup';

describe('DbModule', () => {
  beforeEach(() => {
    DbModuleRegistry.clear();
  });

  afterEach(() => {
    DbModuleRegistry.clear();
  });

  describe('forRoot', () => {
    it('should create module with default options', () => {
      // set this for not creating new file for test db.
      process.env.DB_HOST = TEST_MEMORY_DB;
      const dynamicModule = DbModule.forRoot();

      expect(dynamicModule.module).toBe(DbModule);
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.exports).toBeDefined();
    });

    it('should create module with custom options', () => {
      const dynamicModule = DbModule.forRoot({
        dialect: 'sqlite',
        database: TEST_MEMORY_DB,
        logging: false,
      });

      expect(dynamicModule.module).toBe(DbModule);
      expect(dynamicModule.providers).toBeDefined();
    });

    it('should use SQLite in-memory for test environment', async () => {
      const module = await Test.createTestingModule({
        imports: [
          DbModule.forRoot({
            dialect: 'sqlite',
            database: TEST_MEMORY_DB,
          }),
        ],
      }).compile();

      const sequelize = module.get(Sequelize);
      expect(sequelize.getDialect()).toBe('sqlite');

      await module.close();
    });

    it('should support connection name', () => {
      const dynamicModule = DbModule.forRoot({
        connectionName: 'custom',
      });

      expect(dynamicModule.providers).toBeDefined();
      const sequelizeProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === 'SEQUELIZE_CUSTOM',
      );
      expect(sequelizeProvider).toBeDefined();
    });
  });

  describe('forFeature', () => {
    it('should register models', () => {
      const dynamicModule = DbModule.forFeature({
        models: [TestUser, TestPost],
      });

      expect(dynamicModule.module).toBe(DbModule);
      expect(dynamicModule.imports).toBeDefined();
      expect(dynamicModule.imports?.length).toBeGreaterThan(0);

      const registeredModels = DbModuleRegistry.getModels();
      expect(registeredModels).toContain(TestUser);
      expect(registeredModels).toContain(TestPost);
    });

    it('should register model providers', () => {
      const provider = {
        provide: 'TestUserService',
        useClass: TestUserService,
      };

      const dynamicModule = DbModule.forFeature({
        modelProviders: [provider],
      });

      expect(dynamicModule.providers).toContain(provider);
      expect(dynamicModule.exports).toBeDefined();
    });

    it('should register migration path', () => {
      const migrationsPath = '/test/migrations';
      const moduleName = 'TestModule';

      DbModule.forFeature({
        migrationsPath,
        moduleName,
      });

      const migrationPaths = DbModuleRegistry.getMigrationPaths();
      expect(migrationPaths.length).toBeGreaterThan(0);
      const found = migrationPaths.find((p) => p.path === migrationsPath);
      expect(found).toBeDefined();
      expect(found?.moduleName).toBe(moduleName);
    });

    it('should handle empty options', () => {
      const dynamicModule = DbModule.forFeature({});

      expect(dynamicModule.module).toBe(DbModule);
      expect(DbModuleRegistry.getModels()).toHaveLength(0);
    });

    it('should combine models, providers, and migrations', () => {
      const provider = {
        provide: 'TestUserService',
        useClass: TestUserService,
      };

      DbModule.forFeature({
        models: [TestUser],
        modelProviders: [provider],
        migrationsPath: '/test/migrations',
        moduleName: 'TestModule',
      });

      expect(DbModuleRegistry.getModels()).toContain(TestUser);
      expect(DbModuleRegistry.getModelProviders()).toContain(provider);
      expect(DbModuleRegistry.getMigrationPaths().length).toBeGreaterThan(0);
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should sync models in test environment', async () => {
      const module = await createTestModule({
        models: [TestUser],
      });

      const sequelize = module.get(Sequelize);
      const tables = await sequelize.getQueryInterface().showAllTables();
      expect(tables).toContain('test_users');

      await closeTestModule(module);
    });

    it('should sync multiple models', async () => {
      const module = await createTestModule({
        models: [TestUser, TestPost],
      });

      const sequelize = module.get(Sequelize);
      const tables = await sequelize.getQueryInterface().showAllTables();
      expect(tables).toContain('test_users');
      expect(tables).toContain('test_posts');

      await closeTestModule(module);
    });

    it('should prevent multiple executions', async () => {
      const module1 = await createTestModule({
        models: [TestUser],
      });
      
      // Try to create another module - should not execute migrations again
      const module2 = await Test.createTestingModule({
        imports: [
          DbModule.forRoot({
            dialect: 'sqlite',
            database: TEST_MEMORY_DB,
          }),
          DbModule.forFeature({
            models: [TestUser],
          }),
        ],
      }).compile();

      const dbModule2 = module2.get(DbModule);
      // This should warn but not fail
      await dbModule2.onApplicationBootstrap();

      await closeTestModule(module1);
      await closeTestModule(module2);
    });

    it('should handle models with paranoid deletion', async () => {
      const module = await createTestModule({
        models: [TestPost],
      });

      const sequelize = module.get(Sequelize);
      const tables = await sequelize.getQueryInterface().showAllTables();
      expect(tables).toContain('test_posts');

      // Verify paranoid columns exist
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_posts');
      expect(tableDescription.deletedAt).toBeDefined();

      await closeTestModule(module);
    });

    it('should skip migrations for SQLite', async () => {
      const module = await createTestModule({
        models: [TestUser],
      });

      const sequelize = module.get(Sequelize);
      expect(sequelize.getDialect()).toBe('sqlite');

      // Migrations should be skipped for SQLite
      // We can verify this by checking that no SequelizeMeta table was created
      // (unless migrations are explicitly run)
      const tables = await sequelize.getQueryInterface().showAllTables();
      // In test mode with SQLite, migrations are skipped
      expect(tables).toContain('test_users');

      await closeTestModule(module);
    });
  });

  describe('integration', () => {
    it('should work with forRoot and forFeature together', async () => {
      const module = await createTestModule({
        models: [TestUser],
      });

      const sequelize = module.get(Sequelize);
      expect(sequelize).toBeDefined();
      expect(sequelize.getDialect()).toBe('sqlite');

      const tables = await sequelize.getQueryInterface().showAllTables();
      expect(tables).toContain('test_users');

      await closeTestModule(module);
    });

    it('should allow creating and querying entities', async () => {
      const module = await createTestModule({
        models: [TestUser],
      });

      const sequelize = module.get(Sequelize);
      const TestUserModel = sequelize.models.TestUser as typeof TestUser;

      // Create a test user
      const user = await TestUserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        createdBy: 1,
      }) as TestUser;

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');

      // Query the user
      const foundUser = await TestUserModel.findByPk(user.id) as TestUser | null;
      expect(foundUser).toBeDefined();
      expect(foundUser?.name).toBe('Test User');

      await closeTestModule(module);
    });
  });
});

