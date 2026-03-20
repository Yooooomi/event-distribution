import { Environment } from '../../domain/core/environment';

export class ProcessEnvironment implements Environment {
  get(key: string): string | undefined {
    return process.env[key];
  }
}
