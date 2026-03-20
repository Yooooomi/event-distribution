export interface ConversationCard {
  userId: string;
  conversationId: string;
  title: string;
  lastMessageSenderId: string | null;
  lastMessageContent: string | null;
  lastMessageTimestamp: Date | null;
}
