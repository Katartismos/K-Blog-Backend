import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArcjetModule } from './arcjet/arcjet.module';
import { PostsModule } from './posts/posts.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ArcjetModule, PostsModule, DatabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
