/**
 * @author: Artur (Seti) Łabudziński
 */

import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import Sequelize, { FindAndCountOptions, FindOptions, Op, Order, Transaction, WhereOptions } from 'sequelize';
import { Model, ModelCtor, Sequelize as SequelizeType }                        from 'sequelize-typescript';
import { IncludeOptions, InferAttributes }                                     from 'sequelize';
import { Attributes, CreateOptions, CreationAttributes, WhereAttributeHash } from 'sequelize/types/model';
import { DbCountAndRows, DefaultModelColumns, IncludeCustomOptions, OptionIgnoreIncludes, OptionIncludeables, OptionInvoker, OptionRaw, OptionSetUpdater, OptionTransaction, OrderElement } from '../entity/abstract.entity';
import { GlobalSearchLimitConst } from '../consts/global-search-limit.const';


@Injectable()
export abstract class AbstractDbService<TModelAttributes extends {} = any, TCreationAttributes extends { } = TModelAttributes, T extends Model<TModelAttributes, TCreationAttributes> = Model<TModelAttributes, TCreationAttributes>, IdType = number | string> implements OnApplicationBootstrap {
  protected _logger: Logger = new Logger(AbstractDbService.name);

  protected _modelName!: string;

  protected paranoid!: boolean;
  
  protected idColumn: (string & keyof T) | Array<(keyof TModelAttributes)> = 'id';
  
  // which columns can be used for sorting on this service
  protected allowedSortingColumns: Array<string & keyof T> = ['id', 'createdAt'];
  
  // if the column is not found in mappings, meaning self model, otherwise it is on other model, and that model must be included
  protected columnModelMappings: [string & keyof T, ModelCtor][] = [];

  // default order
  protected defaultOrder?: Order | OrderElement<TModelAttributes>; // = [['name', 'ASC'], ['id', 'DESC']];

  // default includes for default finds
  protected defaultInclude: (IncludeOptions & IncludeCustomOptions)[] = [];

  protected defaultNameColumn?: keyof TModelAttributes; // 'name' as any;
  
  private className: string;
  
  private static instance: AbstractDbService;
  
  protected constructor(
    protected dbService: ModelCtor<T>,
  ) {
    this.className = this.constructor.name;
    
    if (!AbstractDbService.instance) (AbstractDbService as any).instance = this;
  }
  
  protected getRowId(row: T): IdType | string {
    const ret = this.getRowIds(row);
    if (typeof this.idColumn === 'string') return ret[0];
    
    return ret.join(',') as any;
  }
  
  protected getRowIds(row: T): IdType[] {
    return (Array.isArray(this.idColumn) ? this.idColumn : [this.idColumn]).map(c => row[(c as keyof T)] as any as IdType);
  }
  
  
  static getStaticOperator(operator: symbol) {
    return AbstractDbService.instance.getOperator(operator);
  }
  
  static findAndCountAll<M extends Model>(
    options?: Omit<FindAndCountOptions<Attributes<M>>, 'group'>,
  ) {
    return AbstractDbService.instance.dbService.findAndCountAll(options);
  }
  
  onApplicationBootstrap(): any {
    try {
      this._modelName = this.dbService.options.name?.singular || '--Unknown--';
      this._logger = new Logger(this._modelName);
      
      if ((this as any).paranoid === undefined) {
        this.paranoid = !!this.dbService.options.paranoid;
      } else {
        this._logger.warn(`[construct] Overwriting PARANOID option of model with: ${ this.paranoid }`);
      }
      
      this._logger.verbose('Loaded Abstract Class Service');
    } catch (err) {
      if (!this.dbService.options) (new Logger(this.className)).error(`Model for ${ this.className } must be added to Models of Sequelize!`);
      
      throw err;
    }
  }
  
  async create(creationArguments: CreationAttributes<T>, options?: CreateOptions<Attributes<T>>): Promise<T> {
    try {
      const row = await this.dbService.create(creationArguments, options);
      this._logger.debug(`[create] [id:${ this.getRowId(row) }]`);
      
      return row;
    } catch (err) {
      throw err;
    }
  }
  
  public parseSorters(order: Array<[keyof Model<TModelAttributes, TCreationAttributes>, 'ASC' | 'DESC']>) {
    for (const element of order) {
      if (this.allowedSortingColumns.includes(element[0])) {
        if (!['ASC', 'DESC'].includes(element[1])) throw new BadRequestException('Order needs usage ONLY of ASC and DESC using capital letters!');
      } else {
        throw new BadRequestException(`Ordering by column [${ element[0] }] is not allowed`);
      }
    }
    
    return order as Order;
  }
  
  // Return type of public method from exported class has or is using name [OpTypes.or] from external module ]/node_modules/sequelize/types/operators[ but cannot be named
  public prepareOrFieldQueryILike(query: string, separator = ' '): WhereAttributeHash<any> | undefined {
    const needles = query.split(separator).filter(Boolean);
    if (needles.length === 0) return undefined;
    
    return { [Op.or]: needles.map(needle => ({ [this.getOperator(Op.iLike)]: `${ needle }%` })) };
  }
  
  public getLimitAndPage(limit: number = GlobalSearchLimitConst, page: number = 0) {
    const calculatedLimit = limit > GlobalSearchLimitConst ? GlobalSearchLimitConst : (limit < 1 ? 1 : (limit ? limit : GlobalSearchLimitConst));
    
    
    return { limit: calculatedLimit, page, offset: page * limit === 0 ? 0 : page * limit };
  }
    
  public static getLimitAndPageStatic(limit: number = GlobalSearchLimitConst, page: number = 0) {
    const calculatedLimit = limit > GlobalSearchLimitConst ? GlobalSearchLimitConst : (limit < 1 ? 1 : (limit ? limit : GlobalSearchLimitConst));
    
    
    return { limit: calculatedLimit, page, offset: page * limit === 0 ? 0 : page * limit };
  }
  
  public getOperator(operator: symbol): symbol {
    if (this.dbService.sequelize?.getDialect() !== 'postgres') {
      if (operator === Op.iLike) {
        return Op.like;
      }
      
      if (operator === Op.notILike) {
        return Op.notILike;
      }
      
      if (operator === Op.iRegexp) {
        return Op.regexp;
      }
      
      if (operator === Op.notIRegexp) {
        return Op.notRegexp;
      }
    }
    
    return operator;
  }
  
  quoteIdentifier(str: string, force?: boolean) {
    return this.dbService.sequelize?.getQueryInterface().quoteIdentifier(str, force);
  }

  get configuration() {
    const ret = {
      getTableName: () => {
        return this.dbService.tableName;
      },
    };
    
    return ret;
  }
  //this.counterService.configuration.getTableName()
  
  sequelize() {
    return this.dbService.sequelize;
  }
  
  async beginTransaction(): Promise<Transaction> {
    return (this.dbService.sequelize as SequelizeType).transaction();
  }
  
  async executeTransaction<T>(autoCallback: (t: Transaction) => PromiseLike<T>, transaction?: Transaction): Promise<T> {
    if (transaction) {
      // console.trace('existing transaction');
      return autoCallback(transaction);
    }
    
    // console.trace('transaction');
    return (this.dbService.sequelize as SequelizeType).transaction<T>({ autocommit: true, logging: true }, async (x) => autoCallback(x));
  }
  
  public isNotEmptyArray(array: any | any[]): boolean {
    if (!(Array.isArray(array))) return false;
    if (array.length === 0) return false;
    
    return array.filter((o) => o === null || o === undefined || o === '').length !== array.length;
  }
  
  public isEmptyArray(array: any[] | any): boolean {
    return !this.isNotEmptyArray(array);
  }
  
  build(raw: TCreationAttributes): T {
    return this.dbService.build<T>(raw as any);
  }
  
  
  /** BEGIN BLOCK:  Default Db Access Functions */
  async getById(id: IdType, options?: OptionTransaction & OptionRaw & OptionIncludeables & OptionIgnoreIncludes): Promise<T | null> {
    const entity = (typeof id !== 'object') ? (await this.dbService.findByPk<T>(id as any, {
      include: options?.raw ? [] : (options?.ignoreIncludes === true ? (options?.include || []) : (options?.include ? options?.include : this.defaultInclude)),
      transaction: options?.transaction,
      paranoid: false,
    })) : (await this.dbService.findOne({
      where: id as any,
      include: options?.raw ? [] : (options?.ignoreIncludes === true ? (options?.include || []) : (options?.include ? options?.include : this.defaultInclude)),
      transaction: options?.transaction,
      paranoid: false,
    }));
    
    this._logger.debug(`[getById]${ entity ? '' : 'not' } found: [id:${ typeof id === 'object' ? JSON.stringify(id) : id }]`);
    
    return entity;
  }
  
  
  async getAllByIds(ids: IdType[], options?: OptionTransaction & OptionRaw & OptionIncludeables): Promise<T[]> {
    const entities: T[] = await this.dbService.findAll<InferAttributes<T> & Model<any>>({
      where: {
        id: { [Op.in]: ids },
      } as WhereOptions<TModelAttributes>,
      paranoid: false,
      include: options?.include ? options.include : this.defaultInclude,
      raw: options?.raw,
    }) as T[];
    
    this._logger.debug(`[getAllByIds] found [count: ${ entities.length }]`);
    
    return entities;
  }
  
  async getByIds(ids: IdType[], options?: OptionTransaction & OptionRaw): Promise<T[]> {
    const entities = await this.dbService.findAll<Model<TModelAttributes, TCreationAttributes> & Model<any>>({
      where: {
        id: { [Op.in]: ids },
      } as WhereOptions<TModelAttributes>,
      raw: options?.raw,
    });
    
    this._logger.debug(`[getByIds] found [count: ${ entities.length }]`);
    
    return entities as T[];
  }
  
  
  async deleteById(id: IdType, options?: OptionTransaction & OptionInvoker): Promise<boolean> {
    const entity = await this.getById(id, { transaction: options?.transaction }) as T | undefined;
    if (!entity) {
      this._logger.debug(`[deleteById] not found [id:${ id }]`);
      
      throw new NotFoundException(`${ this._modelName }: ${ id } not found`);
    }
    
    if (this.paranoid) {
      if (entity?.deletedAt) {
        this._logger.debug(`[deleteById] nothing to do with [id: ${ id }]`);
        
        return false;
      }
      
      entity.deletedAt = Sequelize.fn('now');
      if (options?.invoker) {
        (entity as unknown as DefaultModelColumns<IdType>).deletedBy = options.invoker;
      }
      
      const saved = await entity.save({ transaction: options?.transaction });
      /* const deleted = */
      await entity.destroy({ transaction: options?.transaction });
      
      this._logger.debug(`[deleteById] deleted in paranoid mode [id: ${ id }]`);
      
      return saved instanceof Model;
    }
    
    await entity.destroy({ transaction: options?.transaction });
    this._logger.debug(`[deleteById] destroyed [id: ${ id }]`);
    
    return true;
  }
  
  async deleteByEntity(entity: T, options?: OptionTransaction & OptionInvoker): Promise<boolean> {
    if (this.paranoid) {
      if (entity?.deletedAt) {
        this._logger.debug(`[deleteByEntity] nothing to do with [id: ${ this.getRowId(entity) }]`);
        
        return false;
      }
      
      entity.deletedAt = Sequelize.fn('now');
      if (options?.invoker) {
        (entity as unknown as DefaultModelColumns<IdType>).deletedBy = options.invoker;
      }
      
      const saved = await entity.save({ transaction: options?.transaction });
      /*const deleted = */
      await entity.destroy({ transaction: options?.transaction });
      
      this._logger.debug(`[deleteByEntity] deleted in paranoid mode [id: ${ this.getRowId(entity) }]`);
      
      return saved instanceof Model;
    }
    
    await entity.destroy({ transaction: options?.transaction });
    this._logger.debug(`[deleteByEntity] destroyed [id: ${ this.getRowId(entity) }]`);
    
    return true;
  }
  
  async unDeleteById(id: IdType, options: OptionTransaction & OptionInvoker): Promise<boolean> {
    const entity = await this.getById(id, { transaction: options?.transaction });
    if (!entity) {
      this._logger.debug(`[unDeleteById] not found [id: ${ id }]`);
      
      throw new NotFoundException('not found');
    }
    
    if (this.paranoid) {
      entity.deletedAt = null;
      (entity as unknown as DefaultModelColumns<IdType>).unDeletedAt = Sequelize.fn('now') as any;
      if (options?.invoker) {
        (entity as unknown as DefaultModelColumns<IdType>).unDeletedBy = options.invoker;
      }
      
      const saved = await entity.save({ transaction: options?.transaction });
      this._logger.debug(`[unDeleteById] un-deleting [id: ${ id }]`);
      
      return saved instanceof Model;
    }
    
    this._logger.debug(`[unDeleteById] failed [id: ${ id }]`);
    
    return false;
  }
  
  async unDeleteByEntity(entity: T, options: OptionInvoker & OptionTransaction & OptionSetUpdater = {}): Promise<boolean> {
    if (!this.paranoid) return false;
    
    await entity.restore({ transaction: options.transaction });
    (entity as unknown as DefaultModelColumns<IdType>).unDeletedBy = options.invoker;
    if (options.setUpdater) (entity as unknown as DefaultModelColumns<IdType>).updatedBy = options.invoker;
    (entity as unknown as DefaultModelColumns<IdType>).unDeletedAt = new Date();
    await entity.save({ transaction: options.transaction });
    
    return true;
  }
  
  public async deleteByIds(ids: IdType[], options?: OptionTransaction & OptionInvoker): Promise<boolean[]> {
    const ret = await this.executeTransaction(async (transaction) => {
      const ret: boolean[] = new Array(ids.length).fill(false);
      
      let error: Error | undefined;
      
      this._logger.debug(`[deleteByIds] deletion with ${ options?.transaction ? 'given' : 'inner' } transaction, starting [ids: ${ ids.join(',') }]`);
      for (const [i, id] of ids.entries()) {
        try {
          ret[i] = await this.deleteById(id, { ...options, transaction });
        } catch (err) {
          if (!(err instanceof NotFoundException)) {
            error = err as Error;
            break;
          }
        }
      }
      
      if (error) {
        this._logger.debug(`[deleteByIds] rollback bulk delete [ids: ${ ids.join(',') }]`);
        
        throw new Error(`TEST_ERROR: Could not delete because of: ${ error.message }`);
      } else {
        
        this._logger.debug(`[deleteByIds] committed bulk delete [ids: ${ ids.join(',') }]`);
      }
      
      return ret;
    }, options?.transaction);
    
    return ret;
  }
  
  async findAll<X extends T = T>(params: FindOptions<TModelAttributes>, options?: { transaction?: Transaction; includeMissing?: true }): Promise<X[]> {
    if (params.order === undefined) {
      params.order = this.defaultOrder as any;
    }
    
    if (Array.isArray(params.order)) {
      // console.log(params.order);
      params.order = this.parseSorters(params.order as any);
    }
    
    if (params.include === undefined) {
      params.include = this.defaultInclude.filter((s) => s.ignoreOnFind !== true);
    }
    
    if (!params.include || !(Array.isArray(params.include))) {
      params.include = (Array.isArray(params.include)) ? params.include : [];
    }
    
    if (options?.includeMissing) {
      for (let i = 0; i < this.defaultInclude.length; ++i) {
        if (!((params.include as (IncludeOptions)[]).find((s) => {
          return (s as IncludeOptions).model === (this.defaultInclude[i] as IncludeOptions).model;
        }))) {
          if ((this.defaultInclude[i] as IncludeCustomOptions).ignoreOnFind !== true) {
            (params.include as IncludeOptions[]).push(this.defaultInclude[i] as IncludeOptions);
          }
        }
      }
    }
    
    if (options?.transaction) {
      params.transaction = options.transaction;
    }
    
    
    try {
      this._logger.log('findAll', { ...params, transaction: params.transaction ? true : false });
    } catch (error) {
      // ignored error of showing data
      this._logger.log('findAll', '.....', { transaction: params.transaction ? true : false });
    }
    
    const ret = this.dbService.findAll<T>(params);
    
    // This is because we can extend (on request) T with X, but builtin findAll can only work with T  
    return ret as unknown as X[];
  }
  
  async find(params: FindAndCountOptions<TModelAttributes>, options?: { transaction?: Transaction; includeMissing?: true }): Promise<DbCountAndRows<T>> {
    if (params.order === undefined) {
      params.order = this.defaultOrder as any;
    }
    
    if (Array.isArray(params.order)) {
      // console.log(params.order);
      params.order = this.parseSorters(params.order as any);
    }
    
    if (params.include === undefined) {
      params.include = this.defaultInclude.filter((s) => s.ignoreOnFind !== true);
    }
    
    if (!params.include || !(Array.isArray(params.include))) {
      params.include = (Array.isArray(params.include)) ? params.include : [];
    }
    
    if (options?.includeMissing) {
      for (let i = 0; i < this.defaultInclude.length; ++i) {
        if (!((params.include as (IncludeOptions)[]).find((s) => {
          return (s as IncludeOptions).model === (this.defaultInclude[i] as IncludeOptions).model;
        }))) {
          if ((this.defaultInclude[i] as IncludeCustomOptions).ignoreOnFind !== true) {
            (params.include as IncludeOptions[]).push(this.defaultInclude[i] as IncludeOptions);
          }
        }
      }
    }
    
    if (options?.transaction) {
      params.transaction = options.transaction;
    }
    
    params.distinct = true;
    params.col = (Array.isArray(this.idColumn)) ? this.idColumn[0] as string : this.idColumn;
    
    
    try {
      this._logger.log('findWithCount', { ...params, transaction: params.transaction ? true : false });

      return this.dbService.findAndCountAll<T>(params);
    } catch (error) {
      // ignored error of showing data
      this._logger.log('findWithCount', '.....', { transaction: params.transaction ? true : false });
      throw error;
    }
  }
  
  /** END BLOCK:  Default Db Access Functions */
}
