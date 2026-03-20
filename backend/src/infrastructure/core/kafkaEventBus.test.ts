import { KafkaEventBus } from './kafkaEventBus';
import { MessageSentEvent } from '../../domain/message/messageSentEvent';
import { WorkspaceCreatedEvent } from '../../domain/workspace/workspaceCreatedEvent';
import { NoRetryError } from './noRetryError';

const producerSend = jest.fn();
const producerConnect = jest.fn();
const producerDisconnect = jest.fn();
const consumerConnect = jest.fn();
const consumerDisconnect = jest.fn();
const consumerSubscribe = jest.fn();
const consumerRun = jest.fn();
const adminConnect = jest.fn();
const adminDisconnect = jest.fn();
const adminListTopics = jest.fn();
const adminCreateTopics = jest.fn();

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: () => ({
      connect: producerConnect,
      disconnect: producerDisconnect,
      send: producerSend,
    }),
    consumer: () => ({
      connect: consumerConnect,
      disconnect: consumerDisconnect,
      subscribe: consumerSubscribe,
      run: consumerRun,
    }),
    admin: () => ({
      connect: adminConnect,
      disconnect: adminDisconnect,
      listTopics: adminListTopics,
      createTopics: adminCreateTopics,
    }),
  })),
}));

describe('KafkaEventBus', () => {
  beforeEach(() => {
    producerSend.mockReset();
    producerConnect.mockReset();
    producerDisconnect.mockReset();
    consumerConnect.mockReset();
    consumerDisconnect.mockReset();
    consumerSubscribe.mockReset();
    consumerRun.mockReset();
    adminConnect.mockReset();
    adminDisconnect.mockReset();
    adminListTopics.mockReset();
    adminCreateTopics.mockReset();

    producerConnect.mockResolvedValue(undefined);
    producerDisconnect.mockResolvedValue(undefined);
    consumerConnect.mockResolvedValue(undefined);
    consumerDisconnect.mockResolvedValue(undefined);
    consumerSubscribe.mockResolvedValue(undefined);
    consumerRun.mockResolvedValue(undefined);
    adminConnect.mockResolvedValue(undefined);
    adminDisconnect.mockResolvedValue(undefined);
    adminListTopics.mockResolvedValue(['domain-events']);
    adminCreateTopics.mockResolvedValue(undefined);
  });

  it('publishes conversation-scoped events with conversationId as the Kafka key', async () => {
    const eventBus = new KafkaEventBus(['localhost:9092'], 'test-client');
    const event = new MessageSentEvent(
      'event-1',
      new Date('2026-03-20T10:00:00.000Z'),
      'message-1',
      'conversation-123',
      'user-1',
      'hello',
    );

    await eventBus.publish(event);

    expect(producerSend).toHaveBeenCalledWith({
      topic: 'domain-events',
      messages: [{ key: 'conversation-123', value: JSON.stringify(event) }],
    });
  });

  it('falls back to eventType when an event class does not define Kafka partition metadata', async () => {
    const eventBus = new KafkaEventBus(['localhost:9092'], 'test-client');
    const event = new WorkspaceCreatedEvent(
      'event-2',
      new Date('2026-03-20T10:00:00.000Z'),
      'workspace-1',
      'General',
    );

    await eventBus.publish(event);

    expect(producerSend).toHaveBeenCalledWith({
      topic: 'domain-events',
      messages: [{ key: 'WorkspaceCreatedEvent', value: JSON.stringify(event) }],
    });
  });

  it('rethrows non-NoRetryError failures so Kafka can retry the message', async () => {
    const eventBus = new KafkaEventBus(['localhost:9092'], 'test-client');
    const event = new MessageSentEvent(
      'event-3',
      new Date('2026-03-20T10:00:00.000Z'),
      'message-2',
      'conversation-999',
      'user-2',
      'retry-me',
    );

    eventBus.subscribe('MessageSentEvent', async () => {
      throw new Error('temporary failure');
    });

    await eventBus.connect();

    const runConfig = consumerRun.mock.calls[0]?.[0];
    await expect(
      runConfig.eachMessage({ message: { value: Buffer.from(JSON.stringify(event)) } }),
    ).rejects.toThrow('temporary failure');
  });

  it('does not rethrow when all failures are NoRetryError', async () => {
    const eventBus = new KafkaEventBus(['localhost:9092'], 'test-client');
    const event = new MessageSentEvent(
      'event-4',
      new Date('2026-03-20T10:00:00.000Z'),
      'message-3',
      'conversation-1000',
      'user-3',
      'do-not-retry',
    );

    eventBus.subscribe('MessageSentEvent', async () => {
      throw new NoRetryError('validation failed');
    });

    await eventBus.connect();

    const runConfig = consumerRun.mock.calls[0]?.[0];
    await expect(
      runConfig.eachMessage({ message: { value: Buffer.from(JSON.stringify(event)) } }),
    ).resolves.toBeUndefined();
  });

  it('still retries when at least one handler fails with retryable error', async () => {
    const eventBus = new KafkaEventBus(['localhost:9092'], 'test-client');
    const event = new MessageSentEvent(
      'event-5',
      new Date('2026-03-20T10:00:00.000Z'),
      'message-4',
      'conversation-1001',
      'user-4',
      'mixed-failure',
    );

    eventBus.subscribe('MessageSentEvent', async () => {
      throw new NoRetryError('ignore this one');
    });

    eventBus.subscribe('MessageSentEvent', async () => {
      throw new Error('retry this one');
    });

    await eventBus.connect();

    const runConfig = consumerRun.mock.calls[0]?.[0];
    await expect(
      runConfig.eachMessage({ message: { value: Buffer.from(JSON.stringify(event)) } }),
    ).rejects.toThrow('retry this one');
  });
});