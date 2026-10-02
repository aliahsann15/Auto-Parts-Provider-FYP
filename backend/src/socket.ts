import { createServer, Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'some-long-random-string-you-generate'

let io: any | null = null
let httpServer: HttpServer | null = null

export function initSocket(app: any, allowedOrigins: string[]) {
  if (io) return io

  httpServer = createServer(app)

  let SocketServer: any
  try {
    // lazy require so app can still run without the package (for environments without install)
    SocketServer = require('socket.io').Server
  } catch (err) {
    console.warn('socket.io not installed; realtime chat disabled.')
    io = null
    return io
  }

  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(null, false)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  })

  // authenticate socket connections using the same JWT as HTTP
  io.use((socket: any, next: (err?: Error) => void) => {
    try {
      const authHeader =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.headers['authorization'] as string) ||
        ''

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim()

      if (!token) {
        return next(new Error('Unauthorized'))
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any
      ;(socket as any).user = {
        userId: decoded?.userId || decoded?.id || decoded?._id,
        role: decoded?.role,
        email: decoded?.email
      }
      return next()
    } catch (err) {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket: any) => {
    socket.on('join-request', (requestId: string) => {
      if (typeof requestId === 'string' && requestId.length > 0) {
        socket.join(requestId)
      }
    })

    socket.on('leave-request', (requestId: string) => {
      if (typeof requestId === 'string' && requestId.length > 0) {
        socket.leave(requestId)
      }
    })
  })

  return io
}

export function getIO() {
  return io
}

export function getHttpServer() {
  if (!httpServer) {
    throw new Error('HTTP server has not been initialized')
  }
  return httpServer
}
