import { Inject, Injectable }   from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op, Transaction } from 'sequelize';
import { Sequelize as SequelizeType } from 'sequelize-typescript/dist/sequelize/sequelize/sequelize';
import { ConfigurationEntity }  from '../entity/configuration.entity';
import { AbstractDbService } from './abstract.db-service';

export interface ConfigurationChangedEvent {
  field: string;
  before: any;
  after: any;
}

type ConfigurationWildcardObjectType = {[key: string]: any} | Record<string, any>;

@Injectable()
export class ConfigurationDbService {
  protected cache: Record<string, (ConfigurationEntity | false)> = {};

  protected updatedAt: Date = 0 as any;

  protected cronWorks: boolean = false;
  
  async executeTransaction<T>(autoCallback: (t: Transaction) => PromiseLike<T>, transaction?: Transaction): Promise<T> {
    if (transaction) {
      return autoCallback(transaction);
    }
    
    return (this.dbService.sequelize as SequelizeType).transaction<T>({ autocommit: true, logging: true }, async (x) => autoCallback(x));
  }
  
  getSequelize() {
    return this.dbService.sequelize;
  }

  getQuoteIdentifier() {
    return this.dbService.sequelize?.getQueryInterface().quoteIdentifier;
  }
  
  constructor(
    @Inject('DB_REPOSITORY-CONFIGURATION') protected readonly dbService: typeof ConfigurationEntity,
    private eventEmitter: EventEmitter2,
  ) {}
  
  @OnEvent('cache-manager.get-usage')
  async getCacheUsage() {
    return {
      module: 'configuration',
      count: Object.keys(this.cache).length,
    };
  }
  
  @OnEvent('configuration.refresh')
  async onConfigurationRefreshRequest() {
    return this.handleRefreshConfiguration();
  }
  
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRefreshConfiguration(isFirstRun = false) {
    if (this.cronWorks) return;
    this.cronWorks = true;
    
    const changes = await this.dbService.findAll({
      attributes: ['field', 'value', 'updatedAt'],
      where: {
        updatedAt: { [Op.gt]: this.updatedAt },
      },
      order: [['updatedAt', 'ASC']],
    });
    
    if (changes.length > 0) {
      const mapped: ConfigurationChangedEvent[] = changes.map((change) => {
        const before = this.cache[change.field] ? (this.cache[change.field] as ConfigurationEntity).value : undefined;
        this.cache[change.field] = change;
        
        return { field: change.field, before, after: change.value };
      });
      
      if (isFirstRun) {
        await this.eventEmitter.emitAsync('configuration.read', mapped);
      } else {
        await this.eventEmitter.emitAsync('configuration.updated', mapped);
        await this.eventEmitter.emitAsync('configuration.modified', mapped);
      }
      
      const lastChange = changes.pop(); 
      
      
      this.updatedAt = lastChange?.updatedAt;
    }
    
    this.cronWorks = false;
  }
  
  @OnEvent('configuration.reload')
  async onReloadRequest() {
    if (this.cronWorks) return 'standard reload in progress';
    
    this.updatedAt = new Date(0);
    
    await this.handleRefreshConfiguration();
    
    return this.cache;
  }
  
  /**
   * 
   * @param {string} key -> with added wildcard at the end
   * @returns {Promise<undefined | T>}
   */
  async getWildcard<T extends ConfigurationWildcardObjectType>(key: string): Promise<undefined | T> {
    const cacheKey = `not-existing:${key}`;
    if (!this.cache.hasOwnProperty(cacheKey)) {
      const values = await this.dbService.findAll({
        where: {
          field: {
            [AbstractDbService.getStaticOperator(Op.iLike)]: `${key}%`,
          },
        },
        // logging: true,
      });
      const tmp: T = {} as T;
      for (const row of values) {
        tmp[row.field.slice(key.length)] = row.value;
      }
      
      this.cache[cacheKey] = tmp as any;
    }
  
    console.log(`Cache wildcard get: ${key}    => [${this.cache[cacheKey]}]`);
    
    return this.cache[cacheKey] === false ? undefined : this.cache[cacheKey] as unknown as T;
  }
  
  async delay(timeout = 50) {
    return new Promise(resolve => {
      setTimeout(resolve, timeout);
    });
  }
  
  async get<T extends any>(key: string): Promise<undefined | T> {
    if (!this.cache.hasOwnProperty(key)) {
      try {
        const value = await this.dbService.findOne({ where: { field: { [Op.eq]: key } } });
        this.cache[key] = value ? value : false;
      } catch (err) {
        // DELAY for initializing the system with empty database
        if ((err as Error).message.includes('" does not exist')) {
          await this.delay(1000);
          
          return this.get(key);
        }
        
        throw err;
      }
    }
    
    // console.log(`Cache getting: ${key}    => [${this.cache[key]}]`);
    
    return this.cache[key] === false ? undefined : (this.cache[key] as ConfigurationEntity).value as T;
  }
  
  /**
   * Updates or created configuration value of given Key with given Value
   *
   * @param {string} key
   * @param {T} value
   * @returns {Promise<T | undefined>}
   */
  async set<T extends any>(key: string, value: T): Promise<T | undefined> {
    if (!this.cache.hasOwnProperty(key) || this.cache[key] === false) {
      this.cache[key] = await this.dbService.create({ field: key, value: value });
      await this.eventEmitter.emitAsync('configuration.created', [ { field: key, before: undefined, after: (this.cache[key] as ConfigurationEntity).value as T } as ConfigurationChangedEvent ]);
      await this.eventEmitter.emitAsync('configuration.set', [ { field: key, before: undefined, after: (this.cache[key] as ConfigurationEntity).value as T } as ConfigurationChangedEvent ]);
      
      return (this.cache[key] as ConfigurationEntity).value as T;
    }
    if (this.cache[key] as ConfigurationEntity | false === false) return undefined;
    
    const before = (this.cache[key] as ConfigurationEntity).value;
    (this.cache[key] as ConfigurationEntity).value = value;

    if (Array.isArray(value)) (this.cache[key] as ConfigurationEntity).changed('value', true);

    const saved = await (this.cache[key] as ConfigurationEntity).save();
    this.eventEmitter.emitAsync('configuration.set', [{ field: key, before: before, after: (this.cache[key] as ConfigurationEntity).value as T } as ConfigurationChangedEvent]);
    
    return saved.value;
  }
  
  async update<T extends any>(key: string, value: T): Promise<T | undefined> {
    if (!this.cache.hasOwnProperty(key) || this.cache[key] === false) {
      return undefined;
    }
    
    this.cache[key] = await this.dbService.create({ field: key, value });
    
    this.eventEmitter.emitAsync('configuration.modified', [ { field: key, before: undefined, after: (this.cache[key] as ConfigurationEntity).value as T } as ConfigurationChangedEvent ]);
    
    return (this.cache[key] as ConfigurationEntity).value as T;
  }
  
  deleteWildCards(field: string) {
    const searchFor = `not-existing:${field}`;
    const keys = Object.keys(this.cache).filter(x => searchFor.startsWith(x));
    
    for (const key of keys) {
      delete this.cache[key];
    }
  }
  
  @OnEvent('configuration.set')
  async onConfigSet(payload: ConfigurationChangedEvent[]) {
    for (const { field } of payload) {
      this.deleteWildCards(field);
    }
  }

  @OnEvent('configuration.modified')
  async onConfigModified(payload: ConfigurationChangedEvent[]) {
    for (const { field } of payload) {
      this.deleteWildCards(field);
    }
  }
  
  
}
