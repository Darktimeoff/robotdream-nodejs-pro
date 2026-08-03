import net from 'node:net'
import { createConnectionHandler } from './core.js'
import { controller } from './app.js'

const PORT = process.env.HTTP_PORT ?? 3000

net.createServer(createConnectionHandler(controller))
  .listen(PORT, () => {
    console.log(`Server is listening http://localhost:${PORT}`)
  })
