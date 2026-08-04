import { Provider } from '@nestjs/common';
import { ModelCtor } from 'sequelize-typescript';
import { DbModuleRegistry } from '../db.module';
import { TestUser, TestPost } from './test-utils/test-models';

describe('DbModuleRegistry', () => {
  beforeEach(() => {
    DbModuleRegistry.clear();
  });

  afterEach(() => {
    DbModuleRegistry.clear();
  });

  describe('registerModels', () => {
    it('should register models', () => {
      const models: ModelCtor[] = [TestUser as ModelCtor, TestPost as ModelCtor];
      DbModuleRegistry.registerModels(models);

      const registeredModels = DbModuleRegistry.getModels();
      expect(registeredModels).toHaveLength(2);
      expect(registeredModels).toContain(TestUser);
      expect(registeredModels).toContain(TestPost);
    });

    it('should accumulate models when called multiple times', () => {
      DbModuleRegistry.registerModels([TestUser as ModelCtor]);
      DbModuleRegistry.registerModels([TestPost as ModelCtor]);

      const registeredModels = DbModuleRegistry.getModels();
      expect(registeredModels).toHaveLength(2);
    });

    it('should handle empty array', () => {
      DbModuleRegistry.registerModels([]);
      expect(DbModuleRegistry.getModels()).toHaveLength(0);
    });
  });

  describe('registerServices', () => {
    it('should register services', () => {
      const service1: Provider = { provide: 'Service1', useValue: {} };
      const service2: Provider = { provide: 'Service2', useValue: {} };
      const services = [service1, service2];

      DbModuleRegistry.registerServices(services);

      const registeredServices = DbModuleRegistry.getServices();
      expect(registeredServices).toHaveLength(2);
      expect(registeredServices).toContain(service1);
      expect(registeredServices).toContain(service2);
    });

    it('should accumulate services when called multiple times', () => {
      const service1: Provider = { provide: 'Service1', useValue: {} };
      const service2: Provider = { provide: 'Service2', useValue: {} };

      DbModuleRegistry.registerServices([service1]);
      DbModuleRegistry.registerServices([service2]);

      const registeredServices = DbModuleRegistry.getServices();
      expect(registeredServices).toHaveLength(2);
    });
  });

  describe('registerModelProviders', () => {
    it('should register model providers', () => {
      const provider1: Provider = { provide: 'ModelProvider1', useValue: {} };
      const provider2: Provider = { provide: 'ModelProvider2', useValue: {} };
      const providers = [provider1, provider2];

      DbModuleRegistry.registerModelProviders(providers);

      const registeredProviders = DbModuleRegistry.getModelProviders();
      expect(registeredProviders).toHaveLength(2);
      expect(registeredProviders).toContain(provider1);
      expect(registeredProviders).toContain(provider2);
    });
  });

  describe('registerMigrationPath', () => {
    it('should register migration path with module name', () => {
      const path = '/path/to/migrations';
      const moduleName = 'TestModule';

      DbModuleRegistry.registerMigrationPath(path, moduleName);

      const migrationPaths = DbModuleRegistry.getMigrationPaths();
      expect(migrationPaths).toHaveLength(1);
      expect(migrationPaths[0]).toEqual({ path, moduleName });
    });

    it('should accumulate migration paths when called multiple times', () => {
      DbModuleRegistry.registerMigrationPath('/path1', 'Module1');
      DbModuleRegistry.registerMigrationPath('/path2', 'Module2');

      const migrationPaths = DbModuleRegistry.getMigrationPaths();
      expect(migrationPaths).toHaveLength(2);
      expect(migrationPaths[0].moduleName).toBe('Module1');
      expect(migrationPaths[1].moduleName).toBe('Module2');
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      DbModuleRegistry.registerModels([TestUser as ModelCtor]);
      DbModuleRegistry.registerServices([{ provide: 'Service', useValue: {} }]);
      DbModuleRegistry.registerModelProviders([{ provide: 'Provider', useValue: {} }]);
      DbModuleRegistry.registerMigrationPath('/path', 'Module');

      DbModuleRegistry.clear();

      expect(DbModuleRegistry.getModels()).toHaveLength(0);
      expect(DbModuleRegistry.getServices()).toHaveLength(0);
      expect(DbModuleRegistry.getModelProviders()).toHaveLength(0);
      expect(DbModuleRegistry.getMigrationPaths()).toHaveLength(0);
    });
  });

  describe('getters return copies', () => {
    it('should return copies, not references', () => {
      DbModuleRegistry.registerModels([TestUser as ModelCtor]);
      const models1 = DbModuleRegistry.getModels();
      const models2 = DbModuleRegistry.getModels();

      expect(models1).not.toBe(models2);
      expect(models1).toEqual(models2);
    });
  });
});


