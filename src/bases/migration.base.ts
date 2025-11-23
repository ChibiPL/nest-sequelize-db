/**
 * @author: Artur (Seti) Łabudziński
 */

import { DataType, Model, Sequelize } from 'sequelize-typescript';
import { CreationAttributes, ModelAttributes } from 'sequelize/types/model';

export type MigrationColumnDefinitions<M extends Model = Model> = ModelAttributes<M, CreationAttributes<M>>;

export const defaultSequelizeMigrationColumns: MigrationColumnDefinitions = {
  createdAt: {
    type: DataType.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    type: DataType.DATE,
    defaultValue: null,
  },
  deletedAt: {
    type: DataType.DATE,
    defaultValue: null,
  },
};

/*export */const abstractSequelizeMigrationColumnsNotParanoid: MigrationColumnDefinitions = {
  createdAt: defaultSequelizeMigrationColumns.createdAt,
  createdBy: {
    type: DataType.INTEGER,
  },
  updatedAt: defaultSequelizeMigrationColumns.updatedAt,
  updatedBy: {
    type: DataType.INTEGER,
  },
};
/*export */const abstractSequelizeMigrationColumns: MigrationColumnDefinitions = {
  ...abstractSequelizeMigrationColumnsNotParanoid,
  deletedAt: defaultSequelizeMigrationColumns.deletedAt,
  deletedBy: {
    type: DataType.INTEGER,
  },
};

export const abstractSequelizeMigrationUndeletedColumns: MigrationColumnDefinitions = {
  ... abstractSequelizeMigrationColumns,
  unDeletedAt: {
    type: DataType.DATE,
    defaultValue: null,
  },
  unDeletedBy: {
    type: DataType.INTEGER,
    defaultValue: null,
  },
};
