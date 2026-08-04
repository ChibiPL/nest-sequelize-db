import { Table, Column, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { AbstractEntity } from '../../entity/abstract.entity';

/**
 * Simple test model for testing DbModule functionality
 */
@Table({ tableName: 'test_users', timestamps: true })
export class TestUser extends AbstractEntity {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.STRING)
  email!: string;
}

/**
 * Test model with paranoid deletion
 */
@Table({ tableName: 'test_posts', timestamps: true, paranoid: true })
export class TestPost extends AbstractEntity {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  title!: string;

  @Column(DataType.TEXT)
  content!: string;
}


