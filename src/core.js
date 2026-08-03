export class Controller {
  _pathMap = {}
  _instance = null

  constructor() {
    if (Controller._instance) {
      return Controller._instance;
    }

    Controller._instance = this
  }

  add(path, method, handler) {
    this._pathMap[path] = {
      ...this._pathMap[path],
      [method]: handler
    }
  }

  process(req, res) {
    const handler = this._pathMap[req.path]?.[req.method] ?? null

    if (!handler) {
      return res
        .addStatus('404 Not Found')
        .send()
    }

    return handler(req, res)
  }
}

export function createConnectionHandler(controller) {
  return (socket) => {
    socket.on('error', (err) => {
      console.error(`socket error: ${err.code ?? err.message}`)
    })

    let data = ''
    socket.on('data', (buffer) => {
      data += buffer.toString('latin1')
      if (!isEnded(data)) return;

      const req = buildRequest(socket, data)

      controller.process(req, buildResponse(req))
    })
  }
}

export function isEnded(data) {
  const END_SYMBOL = '\r\n\r\n'

  if (data.indexOf(END_SYMBOL) === -1) {
    return false
  }

  return true
}

export function buildRequest(socket, data) {
  if (typeof data !== 'string') {
    return {}
  }

  const [handlerInfo, ...temp] = data.split('\r\n')
  const bodyIndex = temp.indexOf('')
  const body = bodyIndex === -1 ? null : temp[bodyIndex + 1]

  const headersFiltered = bodyIndex === -1 ? temp : temp.slice(0, bodyIndex)
  const headers = headersArrayToObject(headersFiltered)

  const [method, path, protocol] = handlerInfo.split(' ');
  const parser = getBodyParser()[headers['content-type']]

  return {
    socket,
    headers,
    method,
    path,
    protocol,
    body: body && parser ? parser(body) : body
  }
}

export function buildResponse(req) {
  const headers = {}
  let status = '200 OK'
  let body = null

  return {
    addStatus(value) {
      status = value
      return this
    },

    addHeader(name, value) {
      headers[name] = value
      return this
    },

    addBody(content) {
      body = content
      return this
    },

    send() {
      const headersStr = Object.entries(headers).reduce((prev, [name, value]) => {
        return prev + `${name}: ${value}\r\n`
      }, '')

      const response = `${req.protocol} ${status}\r\n` +
        headersStr +
        (body === null ? '' : `Content-Length: ${Buffer.byteLength(body)}\r\n`) +
        'Connection: close\r\n\r\n' +
        (body ?? '')

      req.socket.write(response)
      req.socket.end()
    }
  }
}

function headersArrayToObject(headersArray) {
  if (!Array.isArray(headersArray)) {
    return {}
  }

  return headersArray.reduce((prev, current) => {
    const [key, value] = current.split(': ')
    return {
      ...prev,
      [key.toLowerCase()]: value
    }
  }, {})
}

function getBodyParser() {
  const mapContentTypeToHandler = {
    'application/json': toJSON
  }

  function toJSON(data) {
    try {
      return JSON.parse(data)
    } catch {}
  }

  return mapContentTypeToHandler
}
