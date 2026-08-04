import { Injectable } from '@nestjs/common';
import { ModelCtor } from 'sequelize-typescript';
import { AbstractDbService } from '../../services/abstract.db-service';
import { TestUser } from './test-models';

/**
 * Test service for TestUser model
 * Note: In tests, the model should be passed from Sequelize instance
 */
@Injectable()
export class TestUserService extends AbstractDbService {
  constructor(model?: ModelCtor<any>) {
    super(model || (TestUser as ModelCtor<any>));
  }
}

