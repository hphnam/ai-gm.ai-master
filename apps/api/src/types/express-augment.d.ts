// 03-04 audit-added M1 (G1): Express Request.rawBody type augmentation.
// The webhook middleware in main.ts assigns req.rawBody = Buffer; the HMAC guard reads it.
// Without this augmentation, req.rawBody would be implicit any — a silent refactor hazard.
import 'express-serve-static-core'

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer
  }
}

export {}
