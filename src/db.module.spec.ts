import 'reflect-metadata';
import { DbModuleRegistry } from './db.module';
import { ModelCtor } from 'sequelize-typescript';

describe('DbModuleRegistry', () => {
  beforeEach(() => {
    DbModuleRegistry.clear();
  });

  it('starts empty after clear()', () => {
    expect(DbModuleRegistry.getModels()).toHaveLength(0);
    expect(DbModuleRegistry.getServices()).toHaveLength(0);
    expect(DbModuleRegistry.getModelProviders()).toHaveLength(0);
    expect(DbModuleRegistry.getMigrationPaths()).toHaveLength(0);
  });

  it('registerModels() stores and retrieves models', () => {
    const fakeModel = { name: 'FakeModel' } as unknown as ModelCtor;
    DbModuleRegistry.registerModels([fakeModel]);

    const models = DbModuleRegistry.getModels();
    expect(models).toHaveLength(1);
    expect(models[0]).toBe(fakeModel);
  });

  it('registerServices() stores and retrieves services', () => {
    const fakeService = { provide: 'FAKE', useValue: {} };
    DbModuleRegistry.registerServices([fakeService]);

    expect(DbModuleRegistry.getServices()).toHaveLength(1);
    expect(DbModuleRegistry.getServices()[0]).toBe(fakeService);
  });

  it('registerModelProviders() stores and retrieves providers', () => {
    const fakeProvider = { provide: 'FAKE_REPO', useValue: {} };
    DbModuleRegistry.registerModelProviders([fakeProvider]);

    expect(DbModuleRegistry.getModelProviders()).toHaveLength(1);
  });

  it('registerMigrationPath() stores path and module name', () => {
    DbModuleRegistry.registerMigrationPath('/migrations/foo', 'FooModule');

    const paths = DbModuleRegistry.getMigrationPaths();
    expect(paths).toHaveLength(1);
    expect(paths[0].path).toBe('/migrations/foo');
    expect(paths[0].moduleName).toBe('FooModule');
  });

  it('getModels() returns a copy – mutations do not affect the registry', () => {
    const fakeModel = { name: 'FakeModel' } as unknown as ModelCtor;
    DbModuleRegistry.registerModels([fakeModel]);

    const copy = DbModuleRegistry.getModels();
    copy.pop();

    expect(DbModuleRegistry.getModels()).toHaveLength(1);
  });

  it('accumulates multiple registerModels() calls', () => {
    const a = { name: 'A' } as unknown as ModelCtor;
    const b = { name: 'B' } as unknown as ModelCtor;
    DbModuleRegistry.registerModels([a]);
    DbModuleRegistry.registerModels([b]);

    expect(DbModuleRegistry.getModels()).toHaveLength(2);
  });

  it('clear() resets everything', () => {
    DbModuleRegistry.registerModels([{ name: 'X' } as unknown as ModelCtor]);
    DbModuleRegistry.registerMigrationPath('/path', 'Mod');
    DbModuleRegistry.clear();

    expect(DbModuleRegistry.getModels()).toHaveLength(0);
    expect(DbModuleRegistry.getMigrationPaths()).toHaveLength(0);
  });
});
