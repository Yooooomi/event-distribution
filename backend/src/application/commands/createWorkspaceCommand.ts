export class CreateWorkspaceCommand {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}
