import 'reflect-metadata';
import { Op } from 'sequelize';
import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { WithoutUndefined } from '../types/typescript.type';
import { AbstractDbService } from './abstract.db-service';
import { GlobalSearchLimitConst } from '../consts/global-search-limit.const';

// ─── Minimal test model ──────────────────────────────────────────────────────
interface WidgetModelCreationAttributes {
  name: string;
}
interface WidgetModelAttributes extends WidgetModelCreationAttributes {
  id: number;
}

@Table({ tableName: 'widgets', timestamps: true, paranoid: false })
class WidgetModel extends Model<WidgetModelAttributes, WidgetModelCreationAttributes> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;
}

// ─── Concrete service for testing ─────────────────────────────
class WidgetDbService extends AbstractDbService<
  WidgetModelAttributes,
  WidgetModelCreationAttributes,
  WidgetModel
> {
  constructor(model: typeof WidgetModel) {
    super(model);
  }

  setParanoid(value: boolean) {
    this.paranoid = value;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function buildSequelize() {
  const seq = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [WidgetModel],
  });
  await seq.sync({ force: true });

  return seq;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AbstractDbService', () => {
  let seq: Sequelize;
  let service: WidgetDbService;

  beforeAll(async () => {
    seq = await buildSequelize();
    service = new WidgetDbService(WidgetModel);
    
    // Manually trigger bootstrap
    service.onApplicationBootstrap();
  });

  afterAll(async () => {
    await seq.close();
  });

  afterEach(async () => {
    await WidgetModel.destroy({ where: {}, truncate: true });
  });

  // ─── getLimitAndPage ────────────────────────────────────────────────────────
  describe('getLimitAndPage()', () => {
    it('returns default limit when no args given', () => {
      const { limit, page, offset } = service.getLimitAndPage();
      
      expect(limit).toBe(GlobalSearchLimitConst);
      expect(page).toBe(0);
      expect(offset).toBe(0);
    });

    it('clamps limit to GlobalSearchLimitConst when too large', () => {
      const { limit } = service.getLimitAndPage(99_999);
      
      expect(limit).toBe(GlobalSearchLimitConst);
    });

    it('clamps limit to 1 when below 1', () => {
      const { limit } = service.getLimitAndPage(0);
      
      expect(limit).toBe(1);
    });

    it('calculates offset for page > 0', () => {
      const { offset } = service.getLimitAndPage(10, 3);
      
      expect(offset).toBe(30);
    });
  });

  // ─── getLimitAndPageStatic ──────────────────────────────────────────────────
  describe('getLimitAndPageStatic()', () => {
    it('matches instance method results', () => {
      const instance = service.getLimitAndPage(20, 2);
      const staticResult = AbstractDbService.getLimitAndPageStatic(20, 2);
      
      expect(staticResult).toEqual(instance);
    });
  });

  // ─── isNotEmptyArray / isEmptyArray ────────────────────────────────────────
  describe('isNotEmptyArray()', () => {
    it('returns true for a non-empty array with valid items', () => {
      expect(service.isNotEmptyArray([1, 2])).toBe(true);
    });

    it('returns false for empty array', () => {
      expect(service.isNotEmptyArray([])).toBe(false);
    });

    it('returns false for non-array input', () => {
      expect(service.isNotEmptyArray('string')).toBe(false);
    });

    it('returns false when all items are null/undefined/empty string', () => {
      expect(service.isNotEmptyArray([null, undefined, ''])).toBe(false);
    });
  });

  describe('isEmptyArray()', () => {
    it('is the inverse of isNotEmptyArray()', () => {
      expect(service.isEmptyArray([])).toBe(true);
      expect(service.isEmptyArray([1])).toBe(false);
    });
  });

  // ─── parseSorters ───────────────────────────────────────────────────────────
  describe('parseSorters()', () => {
    it('accepts valid columns with valid direction', () => {
      expect(() =>
        service.parseSorters([['id', 'ASC']]),
      ).not.toThrow();
    });

    it('throws on invalid direction', () => {
      expect(() =>
        // @ts-expect-error TS2820: Type 'asc' is not assignable to type 'ASC' | 'DESC'.
        service.parseSorters([['id', 'asc']]),
      ).toThrow('ASC and DESC');
    });

    it('throws on disallowed column', () => {
      expect(() =>
        // @ts-expect-error TS2322 - not a keyof of the model
        service.parseSorters([['unknown_col', 'ASC']]),
      ).toThrow('not allowed');
    });
  });

  // ─── getOperator ────────────────────────────────────────────────────────────
  describe('getOperator()', () => {
    it('maps Op.iLike to Op.like for sqlite dialect', () => {
      expect(service.getOperator(Op.iLike)).toBe(Op.like);
    });

    it('returns the original operator for others', () => {
      expect(service.getOperator(Op.eq)).toBe(Op.eq);
    });
  });

  // ─── prepareOrFieldQueryILike ───────────────────────────────────────────────
  describe('prepareOrFieldQueryILike()', () => {
    it('returns undefined for blank query', () => {
      expect(service.prepareOrFieldQueryILike('')).toBeUndefined();
    });

    it('returns OR clause for a single word', () => {
      const result = service.prepareOrFieldQueryILike('foo');
      
      expect(result).toBeDefined();

      // @ts-expect-error TS2538 - the result is not undefined at this moment.
      expect(result[Op.or]).toHaveLength(1);
    });

    it('splits by separator and builds multiple OR entries', () => {
      const result = service.prepareOrFieldQueryILike('foo bar');
      
      expect(result).toBeDefined();

      // @ts-expect-error TS2538 - the result is not undefined at this moment.
      expect(result[Op.or]).toHaveLength(2);
    });
  });

  // ─── CRUD via WidgetModel ───────────────────────────────────────────────────
  describe('create()', () => {
    it('inserts and returns a model instance', async () => {
      const widget = await service.create({ name: 'Gadget' });
      
      expect(widget.id).toBeDefined();
      expect(widget.name).toBe('Gadget');
    });
  });

  describe('getById()', () => {
    it('returns null when not found', async () => {
      const result = await service.getById(999);
      
      expect(result).toBeNull();
    });

    it('returns the row when found', async () => {
      await service.create({ id: 2, name: 'Widget2' } as any);
      
      const result = await service.getById(2);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Widget2');
    });
  });

  describe('getByIds()', () => {
    it('returns matching rows only', async () => {
      await service.create({ id: 10, name: 'A' } as any);
      await service.create({ id: 11, name: 'B' } as any);
      await service.create({ id: 12, name: 'C' } as any);

      const results = await service.getByIds([10, 12] as any);
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual([10, 12]);
    });
  });

  describe('deleteById()', () => {
    it('returns true when deleted (non-paranoid)', async () => {
      service.setParanoid(false);
      
      await service.create({ id: 20, name: 'ToDelete' } as any);
      const result = await service.deleteById(20 as any);
      
      expect(result).toBe(true);

      const found = await service.getById(20 as any);
      expect(found).toBeNull();
    });

    it('throws NotFoundException when row not found', async () => {
      await expect(service.deleteById(999 as any)).rejects.toThrow('not found');
    });
  });

  describe('build()', () => {
    it('builds an unsaved instance', () => {
      const instance = service.build({ id: 99, name: 'Unsaved' } as any);
      
      expect(instance.name).toBe('Unsaved');
      expect(instance.isNewRecord).toBe(true);
    });
  });

  describe('beginTransaction()', () => {
    it('returns a Transaction object', async () => {
      
      const t = await service.beginTransaction();
      expect(t).toBeDefined();
      await t.rollback();
    });
  });

  describe('executeTransaction()', () => {
    it('runs the callback and returns its result', async () => {
      const result = await service.executeTransaction(async (_t) => 42);
      
      expect(result).toBe(42);
    });

    it('uses the provided transaction when given', async () => {
      const t = await service.beginTransaction();
      const result = await service.executeTransaction(async (_t) => 'reused', t);
      
      expect(result).toBe('reused');
      
      await t.rollback();
    });
  });
});
