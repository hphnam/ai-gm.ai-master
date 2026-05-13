// Friendly aliases over the orval-generated client. Some types only appear
// as nested-item types in the generated output (e.g. ChatMessage is
// ConversationResponseDtoMessagesItem) — alias them here so the rest of
// the app keeps short, ergonomic names.
export type {
  // chat
  ConversationResponseDtoMessagesItem as ChatMessageDto,
  // debug
  DebugConversationResponseDtoMessagesItem as DebugMessageDto,
  DebugConversationResponseDtoMessagesItemFeedback as DebugFeedbackDto,
  DebugRetagQueueResponseDtoItemsItem as DebugRetagQueueItemDto,
  // docs
  DocListItemDtoDocumentType as DocumentTypeDtoNullable,
  KbGapDtoAskedByItem as KbGapAskerDto,
  // invitations
  ListInvitationsResponseDtoInvitationsItem as InvitationDto,
  // proactive suggestions
  ProactiveSuggestionDtoKind as ProactiveSuggestionKind,
  // venues
  VenueDetailDtoProfile as VenueProfileDto,
} from '@/generated/api'
