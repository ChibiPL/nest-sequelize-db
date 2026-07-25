import 'reflect-metadata';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Sequelize } from 'sequelize-typescript';
import { ConfigurationDbService } from './configuration-db.service';
import { ConfigurationEntity } from '../entity/configuration.entity';
import { AbstractDbService } from './abstract.db-service';

async function buildSequelize() {
  const seq = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [ConfigurationEntity],
  });
  await seq.sync({ force: true });

  return seq;
}

class ConfigurationEntityDbService extends AbstractDbService {
  constructor() {
    super(ConfigurationEntity);
  }
}

describe('ConfigurationDbService', () => {
  let seq: Sequelize;
  let service: ConfigurationDbService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    seq = await buildSequelize();
    const configurationEntityDbService = new ConfigurationEntityDbService();
    configurationEntityDbService.onApplicationBootstrap();
    eventEmitter = new EventEmitter2();
    service = new ConfigurationDbService(ConfigurationEntity, eventEmitter);
  });

  afterAll(async () => {
    await seq.close();
  });

  afterEach(async () => {
    await ConfigurationEntity.destroy({ where: {}, truncate: true });
    eventEmitter.removeAllListeners();
    
    service['cache'] = {};
    service['updatedAt'] = new Date(0);
  });

  describe('get()', () => {
    it('returns undefined for a missing key', async () => {
      const result = await service.get('nonexistent');
      
      expect(result).toBeUndefined();
    });

    it('returns the value for a stored key', async () => {
      await ConfigurationEntity.create({ field: 'theme', value: 'dark' });
      const result = await service.get<string>('theme');
      
      expect(result).toBe('dark');
    });

    it('uses cache on second call (no extra DB hit)', async () => {
      await ConfigurationEntity.create({ field: 'cached_key', value: 42 });
      await service.get('cached_key');

      const spyFindOne = jest.spyOn(ConfigurationEntity, 'findOne');
      await service.get('cached_key');
      
      expect(spyFindOne).not.toHaveBeenCalled();
      spyFindOne.mockRestore();
    });
  });

  describe('set()', () => {
    it('creates a new key-value pair', async () => {
      await service.set('app.name', 'MyApp');

      const result = await service.get<string>('app.name');
      
      expect(result).toBe('MyApp');
    });

    it('emits configuration.created on new key', async () => {
      const listener = jest.fn();
      eventEmitter.once('configuration.created', listener);

      await service.set('new.key', 'hello');

      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({ field: 'new.key', after: 'hello' }),
      ]);
    });

    it('updates an existing key-value pair', async () => {
      await service.set('counter', 1);
      await service.set('counter', 2);

      const result = await service.get<number>('counter');
      
      expect(result).toBe(2);
    });
  });

  describe('getWildcard()', () => {
    it('returns an object grouped by suffix', async () => {
      await ConfigurationEntity.create({ field: 'smtp.host', value: 'localhost' });
      await ConfigurationEntity.create({ field: 'smtp.port', value: 25 });

      const result = await service.getWildcard<{ host: string; port: number }>('smtp.');
      
      expect(result).toBeDefined();
      expect(result!.host).toBe('localhost');
      expect(result!.port).toBe(25);
    });

    it('returns an empty object when no matches', async () => {
      const result = await service.getWildcard('no_prefix.');
      
      expect(result).toBeDefined();
      expect(Object.keys(result as object)).toHaveLength(0);
    });
  });

  describe('deleteWildCards()', () => {
    it('removes wildcard cache entries that match the field prefix', async () => {
      await ConfigurationEntity.create({ field: 'prefix.a', value: 1 });
      await service.getWildcard('prefix.');

      expect(Object.prototype.hasOwnProperty.call(service['cache'], 'not-existing:prefix.')).toBe(true);
      
      service.deleteWildCards('prefix.');
      
      expect(Object.prototype.hasOwnProperty.call(service['cache'], 'not-existing:prefix.')).toBe(false);
    });
  });

  describe('handleRefreshConfiguration()', () => {
    it('does not throw on first run with no rows', async () => {
      await expect(service.handleRefreshConfiguration(true)).resolves.not.toThrow();
    });

    it('emits configuration.read on first run with rows', async () => {
      const listener = jest.fn();
      eventEmitter.once('configuration.read', listener);
      
      await ConfigurationEntity.create({ field: 'flag', value: true });
      
      service['updatedAt'] = new Date(0);

      await service.handleRefreshConfiguration(true);

      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({ field: 'flag', after: true }),
      ]);
    });
  });

  describe('getSequelize()', () => {
    it('returns the Sequelize instance', () => {
      const result = service.getSequelize();
      
      expect(result).toBeDefined();
    });
  });

  describe('delay()', () => {
    it('resolves after ~timeout ms', async () => {
      const start = Date.now();
      await service['delay'](30);
      
      expect(Date.now() - start).toBeGreaterThanOrEqual(25);
    });
  });
});
