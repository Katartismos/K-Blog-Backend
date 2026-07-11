import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArcjetModule } from './arcjet/arcjet.module';

@Module({
  imports: [ArcjetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

