import './load-env'

import { CommandFactory } from 'nest-commander'
import { SeedModule } from './modules/seed/seed.module'

async function bootstrap() {
  await CommandFactory.run(SeedModule, ['warn', 'error', 'log'])
}
bootstrap()
