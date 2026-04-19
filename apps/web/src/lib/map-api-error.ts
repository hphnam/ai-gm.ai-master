import { ApiError } from './api-client'

export function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invalid-input':
        return 'Message was not accepted — please shorten or rephrase.'
      case 'venue-not-found':
        return 'Venue not found — pick another from the list.'
      case 'conversation-not-found':
        return 'This conversation no longer exists.'
      case 'message-not-found':
        return 'Assistant message no longer exists.'
      case 'not-assistant-message':
        return "Can't give feedback on your own message."
      case 'not-found':
        return 'Not found.'
      default:
        return 'Something went wrong — please retry.'
    }
  }
  return 'Network error — please retry.'
}
