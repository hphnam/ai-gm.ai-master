// Single source of truth lives in apps/api (registered with @ApiExtraModels
// on AppController so orval picks it up). Web re-exports the generated
// types here under the legacy names so the rest of the app keeps using
// ApiErrorCode / ApiErrorResponse without touching call sites.
export type {
  ApiErrorResponseDto as ApiErrorResponse,
  ApiErrorResponseDtoError as ApiErrorCode,
} from '@/generated/api'
