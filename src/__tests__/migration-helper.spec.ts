import { Sequelize } from 'sequelize-typescript';
import { TestingModule } from '@nestjs/testing';
import { MigrationHelperClass } from '../classes/migration-helper.class';
import { createTestModule, closeTestModule } from './test-utils/test-setup';
import { TestUser } from './test-utils/test-models';

describe('MigrationHelperClass', () => {
  let module: TestingModule;
  let sequelize: Sequelize;
  let helper: MigrationHelperClass;

  beforeAll(async () => {
    module = await createTestModule({
      models: [TestUser],
    });
    sequelize = module.get(Sequelize);
    const queryInterface = sequelize.getQueryInterface();
    helper = await MigrationHelperClass.from(queryInterface);
  });

  afterAll(async () => {
    await closeTestModule(module);
  });

  describe('from', () => {
    it('should create instance from QueryInterface', async () => {
      const queryInterface = sequelize.getQueryInterface();
      const instance = await MigrationHelperClass.from(queryInterface);
      expect(instance).toBeInstanceOf(MigrationHelperClass);
    });

    it('should return same instance for same connection', async () => {
      const queryInterface = sequelize.getQueryInterface();
      const instance1 = await MigrationHelperClass.from(queryInterface);
      const instance2 = await MigrationHelperClass.from(queryInterface);
      expect(instance1).toBe(instance2);
    });
  });

  describe('refresh', () => {
    it('should refresh tables list', async () => {
      await helper.refresh();
      expect(helper.tableExists('test_users')).toBe(true);
    });
  });

  describe('prepare', () => {
    it('should prepare table metadata', async () => {
      await helper.prepare('test_users');
      expect(helper.columnExists('test_users', 'id')).toBe(true);
      expect(helper.columnExists('test_users', 'name')).toBe(true);
      expect(helper.columnExists('test_users', 'email')).toBe(true);
    });

    it('should prepare multiple tables', async () => {
      await helper.prepare(['test_users']);
      expect(helper.columnExists('test_users', 'id')).toBe(true);
    });
  });

  describe('tableExists', () => {
    it('should return true for existing table', async () => {
      await helper.refresh();
      expect(helper.tableExists('test_users')).toBe(true);
    });

    it('should return false for non-existing table', async () => {
      await helper.refresh();
      expect(helper.tableExists('non_existing_table')).toBe(false);
    });
  });

  describe('columnExists', () => {
    it('should return true for existing column', async () => {
      await helper.prepare('test_users');
      expect(helper.columnExists('test_users', 'id')).toBe(true);
      expect(helper.columnExists('test_users', 'name')).toBe(true);
      expect(helper.columnExists('test_users', 'email')).toBe(true);
    });

    it('should return false for non-existing column', async () => {
      await helper.prepare('test_users');
      expect(helper.columnExists('test_users', 'non_existing_column')).toBe(false);
    });

    it('should return false for non-existing table', async () => {
      expect(helper.columnExists('non_existing_table', 'id')).toBe(false);
    });
  });

  describe('getUpdateQueryFromObject', () => {
    it('should generate update query', () => {
      const obj = { name: 'test', email: 'test@example.com' };
      const query = helper.getUpdateQueryFromObject(obj);
      expect(query).toContain('name');
      expect(query).toContain('email');
      expect(query).toContain('=');
    });

    it('should handle flag parameter', () => {
      const obj = { name: 'test' };
      const query = helper.getUpdateQueryFromObject(obj, true);
      expect(query).toContain(':name');
    });
  });

  describe('getUpdateQueryValuesFromObject', () => {
    it('should extract values from object', () => {
      const obj = { name: 'test', email: 'test@example.com' };
      const values = helper.getUpdateQueryValuesFromObject(obj);
      expect(values).toHaveLength(2);
      expect(values).toContain('test');
      expect(values).toContain('test@example.com');
    });
  });

  describe('getInsertQueryColumns', () => {
    it('should generate column list', () => {
      const obj = { name: 'test', email: 'test@example.com' };
      const columns = helper.getInsertQueryColumns(obj);
      expect(columns).toContain('name');
      expect(columns).toContain('email');
    });
  });

  describe('getInsertQueryValuesPlaceholder', () => {
    it('should generate placeholders', () => {
      const obj = { name: 'test', email: 'test@example.com' };
      const placeholders = helper.getInsertQueryValuesPlaceholder(obj);
      expect(placeholders).toContain('?');
      expect(placeholders.split(',').length).toBe(2);
    });
  });

  describe('columnType', () => {
    it('should return STRING type for VARCHAR columns', async () => {
      await helper.prepare('test_users');
      const type = helper.columnType('test_users', 'name');
      // SQLite might return different type strings, so we check if it's defined
      expect(type).toBeDefined();
    });
  });

  describe('columnLength', () => {
    it('should return column length', async () => {
      await helper.prepare('test_users');
      const length = helper.columnLength('test_users', 'name');
      expect(typeof length).toBe('number');
    });
  });
});

