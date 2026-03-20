export class JoinConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string
  ) {}
}
