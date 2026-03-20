export class SendMessageCommand {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly text: string
  ) {}
}
