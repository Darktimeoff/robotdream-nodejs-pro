import tls from 'node:tls'
import fs from 'node:fs'
import { createConnectionHandler } from './core.js'
import { controller } from './app.js'

const PORT = process.env.HTTPS_PORT ?? 3443

const options = {
  key: fs.readFileSync(new URL('../server-key.pem', import.meta.url)),
  cert: fs.readFileSync(new URL('../server-cert.pem', import.meta.url)),
};

tls.createServer(options, createConnectionHandler(controller))
  .listen(PORT, () => {
    console.log(`Server is listening https://localhost:${PORT}`)
  })
