// Friendly aliases over the orval-generated client. Some types only appear
// as nested-item types in the generated output (e.g. ChatMessage is
// ConversationResponseDtoMessagesItem) — alias them here so the rest of
// the app keeps short, ergonomic names.
export type {
  // chat
  ConversationResponseDtoMessagesItem as ChatMessageDto,
  // invitations
  ListInvitationsResponseDtoInvitationsItem as InvitationDto,
  // docs
  DocListItemDtoDocumentType as DocumentTypeDtoNullable,
  KbGapDtoAskedByItem as KbGapAskerDto,
  // debug
  DebugConversationResponseDtoMessagesItem as DebugMessageDto,
  DebugConversationResponseDtoMessagesItemFeedback as DebugFeedbackDto,
  DebugRetagQueueResponseDtoItemsItem as DebugRetagQueueItemDto,
  // venues
  VenueDetailDtoProfile as VenueProfileDto,
  // proactive suggestions
  ProactiveSuggestionDtoKind as ProactiveSuggestionKind,
} from '@/generated/api'
