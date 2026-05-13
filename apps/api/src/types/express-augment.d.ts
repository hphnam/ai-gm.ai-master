// 03-04 audit-added M1 (G1): Express Request.rawBody type augmentation.
// The webhook middleware in main.ts assigns req.rawBody = Buffer; the HMAC guard reads it.
// Without this augmentation, req.rawBody would be implicit any — a silent refactor hazard.
//
// Plan 04-02 Task 1: augment BOTH 'express' and 'express-serve-static-core'. Post-@types/express
// install, tsc now resolves `Request` imported from 'express' to a Request<...> type from
// express-serve-static-core. Declaring on both module IDs guarantees the augmentation merges
// regardless of which import path a caller uses.
import 'express'

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer
  }
}

declare module 'express' {
  interface Request {
    rawBody?: Buffer
  }
}
