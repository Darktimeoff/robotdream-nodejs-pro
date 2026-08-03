import { Controller } from './core.js'

export const controller = new Controller()

controller.add('/', 'GET', (req, res) => res
  .addStatus('200 OK')
  .addHeader('Content-Type', 'text/plain')
  .send())

controller.add('/headers', 'GET', (req, res) => res
  .addStatus('200 OK')
  .addHeader('Content-Type', 'text/plain')
  .addBody(formatHeaders(req.headers))
  .send())

function formatHeaders(headers) {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n') + '\n'
}
