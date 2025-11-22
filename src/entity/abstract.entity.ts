import { Includeable, Transaction } from 'sequelize';
import { AllowNull, Column, DataType, Model } from 'sequelize-typescript';
import { Col, Fn, Literal } from 'sequelize/types/utils';

export type AllAttributes<T extends Model> = T extends AbstractEntity<infer TCreationAttributes, infer TModelAttributes> ? TModelAttributes : never;

export type DbCountAndRows<M> = { count: number; rows: M[] };

export interface IncludeCustomOptions {
  ignoreOnFind?: true;
  onlyShowOnFind?: true;
}

export interface OptionTransaction {transaction?: Transaction}

export interface OptionRaw {raw?: true}

export interface OptionIgnoreIncludes {ignoreIncludes?: boolean}

export interface OptionIncludeables {include?: Includeable[]}

export interface OptionInvoker {invoker?: number}

export interface OptionSetUpdater {setUpdater?: boolean}

export type OrderElement<T> = [keyof T | string | Col | Fn | Literal, 'ASC' | 'DESC'][];


export type Nullable<T> = T | null;

export interface DefaultModelColumnsCreate {
  createdBy: number;
}
export interface DefaultModelColumns<T = number> extends DefaultModelColumnsCreate {
  id: T;
  createdAt: Date;
  updatedAt?: Nullable<Date>;
  deletedAt?: Nullable<Date>;
  
  deletedBy?: Nullable<number>;
  updatedBy?: Nullable<number>;
  
  unDeletedAt?: Nullable<Date>;
  unDeletedBy?: Nullable<number>;
}

 
export class AbstractEntity<TModelAttributes extends {} = any, TCreationAttributes extends {} = TModelAttributes> extends Model<TModelAttributes, TCreationAttributes> {
  @AllowNull(true)
  @Column(DataType.INTEGER)
  createdBy!: number;
  
  @AllowNull(true)
  @Column(DataType.INTEGER)
  updatedBy?: number;
  
  @AllowNull(true)
  @Column(DataType.INTEGER)
  deletedBy?: number;
  
  @AllowNull(true)
  @Column(DataType.DATE)
  unDeletedAt?: Date | any; // for Sequelize.fn
  
  @AllowNull(true)
  @Column(DataType.INTEGER)
  unDeletedBy?: number;
}

export interface DefaultAdminDtoColumns {
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  deletedAt?: Date;
  deletedBy?: number;
  unDeletedAt?: Date;
  unDeletedBy?: number;
}

export const attachDefaultColumnsToDto = <T>(source: T & DefaultAdminDtoColumns, data: any) => {
  source.createdAt = data.createdAt;
  source.createdBy = data.createdBy;
  source.updatedAt = data.updatedAt;
  source.updatedBy = data.updatedBy;
  source.deletedAt = data.deletedAt;
  source.deletedBy = data.deletedBy;
  source.unDeletedAt = data.unDeletedAt;
  source.unDeletedBy = data.unDeletedBy;
};
