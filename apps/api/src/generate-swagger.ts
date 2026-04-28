import './load-env'

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false })
  const config = new DocumentBuilder()
    .setTitle('GM AI API')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  const outPath = resolve(__dirname, '../../swagger.json')
  writeFileSync(outPath, JSON.stringify(document, null, 2))
  console.log(`swagger.json written → ${outPath}`)
  await app.close()
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})
