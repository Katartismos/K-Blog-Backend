import { Module, Global } from '@nestjs/common';
import { databaseProvider, DATABASE_CONNECTION, DatabaseService } from './database.provider';

@Global()
@Module({
  providers: [DatabaseService, databaseProvider],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
