import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

export interface ConfigurationEntityAttributes {
  field: string;
  value: any;
  
  comment?: string;
}

@Table({
  tableName: 'configuration',
  paranoid: false,
})
export class ConfigurationEntity extends Model<ConfigurationEntity, ConfigurationEntityAttributes> {
  @PrimaryKey
  @Column(DataType.STRING(99))
  field!: string;
  
  @Column(DataType.JSONB)
  value!: any;
  
  @Column(DataType.STRING(255))
  comment!: string;
}
