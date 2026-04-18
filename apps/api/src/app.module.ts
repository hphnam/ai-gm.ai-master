import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'

@Module({
  imports: [EmbeddingsModule],
  controllers: [AppController],
})
export class AppModule {}
