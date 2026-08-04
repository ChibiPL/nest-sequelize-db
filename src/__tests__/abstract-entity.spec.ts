import { Sequelize } from 'sequelize-typescript';
import { AbstractEntity } from '../entity/abstract.entity';
import { Table, Column, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { createTestModule, closeTestModule } from './test-utils/test-setup';
import { TestingModule } from '@nestjs/testing';

/**
 * Test entity extending AbstractEntity
 */
@Table({ tableName: 'test_abstract_entity', timestamps: true })
class TestAbstractEntityModel extends AbstractEntity {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;
}

describe('AbstractEntity', () => {
  let module: TestingModule;
  let sequelize: Sequelize;

  beforeAll(async () => {
    module = await createTestModule({
      models: [TestAbstractEntityModel],
    });
    sequelize = module.get(Sequelize);
  });

  afterAll(async () => {
    await closeTestModule(module);
  });

  describe('default columns', () => {
    it('should have createdBy column', async () => {
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_abstract_entity');

      expect(tableDescription.createdBy).toBeDefined();
      expect(tableDescription.createdBy.type).toContain('INTEGER');
      expect(tableDescription.createdBy.allowNull).toBe(true);
    });

    it('should have updatedBy column', async () => {
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_abstract_entity');

      expect(tableDescription.updatedBy).toBeDefined();
      expect(tableDescription.updatedBy.type).toContain('INTEGER');
      expect(tableDescription.updatedBy.allowNull).toBe(true);
    });

    it('should have deletedBy column', async () => {
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_abstract_entity');

      expect(tableDescription.deletedBy).toBeDefined();
      expect(tableDescription.deletedBy.type).toContain('INTEGER');
      expect(tableDescription.deletedBy.allowNull).toBe(true);
    });

    it('should have unDeletedAt column', async () => {
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_abstract_entity');

      expect(tableDescription.unDeletedAt).toBeDefined();
      expect(tableDescription.unDeletedAt.type).toContain('DATE');
      expect(tableDescription.unDeletedAt.allowNull).toBe(true);
    });

    it('should have unDeletedBy column', async () => {
      const tableDescription = await sequelize
        .getQueryInterface()
        .describeTable('test_abstract_entity');

      expect(tableDescription.unDeletedBy).toBeDefined();
      expect(tableDescription.unDeletedBy.type).toContain('INTEGER');
      expect(tableDescription.unDeletedBy.allowNull).toBe(true);
    });
  });

  describe('entity operations', () => {
    it('should create entity with createdBy', async () => {
      const entity = await TestAbstractEntityModel.create({
        name: 'Test Entity',
        createdBy: 1,
      });

      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('Test Entity');
      expect(entity.createdBy).toBe(1);
      expect(entity.createdAt).toBeDefined();
    });

    it('should update entity with updatedBy', async () => {
      const entity = await TestAbstractEntityModel.create({
        name: 'Original Name',
        createdBy: 1,
      });

      entity.name = 'Updated Name';
      entity.updatedBy = 2;
      await entity.save();

      expect(entity.name).toBe('Updated Name');
      expect(entity.updatedBy).toBe(2);
      expect(entity.updatedAt).toBeDefined();
    });

    it('should handle deletedBy in paranoid mode', async () => {
      @Table({ tableName: 'test_paranoid_entity', timestamps: true, paranoid: true })
      class TestParanoidEntity extends AbstractEntity {
        @PrimaryKey
        @AutoIncrement
        @Column(DataType.INTEGER)
        id!: number;

        @Column(DataType.STRING)
        name!: string;
      }

      const paranoidModule = await createTestModule({
        models: [TestParanoidEntity],
      });
      const paranoidSequelize = paranoidModule.get(Sequelize);

      const entity = await TestParanoidEntity.create({
        name: 'Paranoid Entity',
        createdBy: 1,
      });

      // Soft delete
      entity.deletedBy = 3;
      await entity.destroy();

      const found = await TestParanoidEntity.findByPk(entity.id);
      expect(found).toBeNull(); // Should be null in paranoid mode

      const foundWithParanoid = await TestParanoidEntity.findByPk(entity.id, {
        paranoid: false,
      });
      expect(foundWithParanoid).toBeDefined();
      expect(foundWithParanoid?.deletedBy).toBe(3);
      expect(foundWithParanoid?.deletedAt).toBeDefined();

      await closeTestModule(paranoidModule);
    });
  });
});


