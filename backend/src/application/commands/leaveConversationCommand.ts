export class LeaveConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string
  ) {}
}
