'use client'

import { io, type Socket } from 'socket.io-client'
import { API_URL } from '@/lib/api-client'

// Single shared socket per browser session. Multiple hooks across the app
// (kb, notifications, future channels) attach listeners to this one socket
// so we don't multi-connect. Reference-counted: the connection tears down
// when nothing is listening.
let sharedSocket: Socket | null = null
let listenerCount = 0

export function acquireSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    })
  }
  listenerCount += 1
  return sharedSocket
}

export function releaseSocket(): void {
  listenerCount -= 1
  if (listenerCount <= 0) {
    listenerCount = 0
    sharedSocket?.disconnect()
    sharedSocket = null
  }
}
