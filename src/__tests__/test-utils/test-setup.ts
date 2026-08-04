import { Test, TestingModule } from '@nestjs/testing';
import { TEST_MEMORY_DB } from '../../consts/tests.consts';
import { DbModule, DbModuleRegistry } from '../../db.module';

/**
 * Setup test environment with SQLite in-memory database
 */
export async function createTestModule(options?: {
  models?: any[];
  services?: any[];
  modelProviders?: any[];
  migrationsPath?: string;
  moduleName?: string;
}): Promise<TestingModule> {
  // Clear registry before each test
  DbModuleRegistry.clear();

  // Reset migration executed flag for tests
  (DbModule as any).migrationExecuted = false;

  // Set test environment
  const dbName = TEST_MEMORY_DB;

  const imports: any[] = [
    DbModule.forRoot({
      dialect: 'sqlite',
      database: dbName,
    }),
  ];

  if (options?.models || options?.services || options?.modelProviders || options?.migrationsPath) {
    imports.push(
      DbModule.forFeature({
        models: options?.models || [],
        services: options?.services || [],
        modelProviders: options?.modelProviders || [],
        migrationsPath: options?.migrationsPath,
        moduleName: options?.moduleName,
      }),
    );
  }

  const module = await Test.createTestingModule({
    imports,
  }).compile();

  // Trigger onApplicationBootstrap
  const dbModule = module.get(DbModule);
  await dbModule.onApplicationBootstrap();

  return module;
}

/**
 * Cleanup test module and close database connections
 */
export async function closeTestModule(module: TestingModule): Promise<void> {
  // const sequelize = module.get(Sequelize);
  await module.close();
  DbModuleRegistry.clear();
}

