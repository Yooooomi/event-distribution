export class CreateConversationCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly title: string
  ) {}
}
