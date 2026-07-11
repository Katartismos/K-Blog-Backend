import { Module, Global } from '@nestjs/common';
import { databaseProvider, DATABASE_CONNECTION } from './database.provider';

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
