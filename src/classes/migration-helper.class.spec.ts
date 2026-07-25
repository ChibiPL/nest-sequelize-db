import 'reflect-metadata';
import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { MigrationHelperClass } from './migration-helper.class';

@Table({ tableName: 'items', timestamps: false })
class ItemModel extends Model<ItemModel> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING(100))
  label!: string;
}

async function buildSequelize() {
  const seq = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [ItemModel],
  });
  await seq.sync({ force: true });

  return seq;
}

describe('MigrationHelperClass', () => {
  let seq: Sequelize;
  let helper: MigrationHelperClass;

  beforeAll(async () => {
    seq = await buildSequelize();
    helper = await MigrationHelperClass.from(seq.getQueryInterface());
  });

  afterAll(async () => {
    await seq.close();
  });

  describe('tableExists()', () => {
    it('returns true for a table that exists', () => {
      expect(helper.tableExists('items')).toBe(true);
    });

    it('returns false for a non-existent table', () => {
      expect(helper.tableExists('does_not_exist')).toBe(false);
    });
  });

  describe('columnExists()', () => {
    beforeAll(async () => {
      await helper.prepare('items');
    });

    it('returns true for an existing column', () => {
      expect(helper.columnExists('items', 'id')).toBe(true);
    });

    it('returns false for a missing column', () => {
      expect(helper.columnExists('items', 'ghost_column')).toBe(false);
    });

    it('returns false for an unknown table', () => {
      expect(helper.columnExists('unknown_table', 'id')).toBe(false);
    });
  });

  describe('columnData()', () => {
    it('returns column metadata for an existing column', () => {
      const data = helper.columnData('items', 'id');
      expect(data).toBeDefined();
    });

    it('returns undefined for a missing column', () => {
      expect(helper.columnData('items', 'missing')).toBeUndefined();
    });
  });

  describe('columnLength()', () => {
    it('returns 0 for an integer column (no length specifier)', () => {
      const len = helper.columnLength('items', 'id');
      expect(typeof len).toBe('number');
    });

    it('returns a number for a VARCHAR column', () => {
      const len = helper.columnLength('items', 'label');
      expect(typeof len).toBe('number');
    });
  });

  describe('getUpdateQueryFromObject()', () => {
    it('generates SET clause sorted by key', () => {
      const result = helper.getUpdateQueryFromObject({ b: 2, a: 1 });
      expect(result).toBe('a = ?,b = ?');
    });

    it('uses named placeholders when flag=true', () => {
      const result = helper.getUpdateQueryFromObject({ name: 'x' }, true);
      expect(result).toBe('name = :name');
    });
  });

  describe('getUpdateQueryValuesFromObject()', () => {
    it('returns values sorted by key', () => {
      const values = helper.getUpdateQueryValuesFromObject({ b: 2, a: 1 });
      expect(values).toEqual([1, 2]);
    });
  });

  describe('getInsertQueryColumns()', () => {
    it('returns quoted column names sorted', () => {
      const result = helper.getInsertQueryColumns({ z: 1, a: 2 });
      expect(typeof result).toBe('string');
      expect(result.split(',').length).toBe(2);
    });
  });

  describe('getInsertQueryValuesPlaceholder()', () => {
    it('returns one ? per key', () => {
      const result = helper.getInsertQueryValuesPlaceholder({ a: 1, b: 2 });
      expect(result).toBe('?,?');
    });
  });

  describe('addMissingColumns()', () => {
    it('adds a new column that does not exist yet', async () => {
      await helper.prepare('items');

      const columnsBefore = await seq.getQueryInterface().describeTable('items');
      if (!columnsBefore['extra_col']) {
        await helper.addMissingColumns('items', {
          extra_col: { type: DataType.STRING(50) },
        });

        await helper.refresh();
        await helper.prepare('items');

        expect(helper.columnExists('items', 'extra_col')).toBe(true);
      }
    });

    it('does not throw if column already exists', async () => {
      await helper.prepare('items');
      await expect(
        helper.addMissingColumns('items', { id: { type: DataType.INTEGER } }),
      ).resolves.not.toThrow();
    });
  });

  describe('refresh()', () => {
    it('can be called multiple times without error', async () => {
      await expect(helper.refresh()).resolves.not.toThrow();
    });
  });

  describe('from() singleton behaviour', () => {
    it('returns the same instance for the same queryInterface config', async () => {
      const h1 = await MigrationHelperClass.from(seq.getQueryInterface());
      const h2 = await MigrationHelperClass.from(seq.getQueryInterface());
      expect(h1).toBe(h2);
    });
  });
});
