import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  ScrollArea,
  Separator,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import { PaperPlaneIcon, PlusIcon } from "@radix-ui/react-icons";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type User = {
  id: string;
  name: string;
};

type Workspace = {
  id: string;
  name: string;
};

type Conversation = {
  id: string;
  workspaceId: string;
  title: string;
  members: string[];
};

type ConversationCard = {
  userId: string;
  conversationId: string;
  title: string;
  lastMessageSenderId: string | null;
  lastMessageContent: string | null;
  lastMessageTimestamp: string | null;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
};

type ConversationListItem = {
  conversationId: string;
  title: string;
  subtitle: string;
  joined: boolean;
};

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationCards, setConversationCards] = useState<ConversationCard[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const visibleConversations = useMemo<ConversationListItem[]>(() => {
    if (!selectedWorkspaceId) return [];

    const cardsByConversationId = new Map(
      conversationCards.map((card) => [card.conversationId, card]),
    );
    const selectedUserMembership = new Set(
      conversations
        .filter((conversation) => selectedUserId && conversation.members.includes(selectedUserId))
        .map((conversation) => conversation.id),
    );

    return conversations
      .filter((conversation) => conversation.workspaceId === selectedWorkspaceId)
      .map((conversation) => {
        const card = cardsByConversationId.get(conversation.id);
        const joined = selectedUserMembership.has(conversation.id);

        return {
          conversationId: conversation.id,
          title: conversation.title,
          subtitle: joined
            ? card?.lastMessageContent || "No message yet"
            : "Join this conversation",
          joined,
        };
      });
  }, [conversations, conversationCards, selectedWorkspaceId, selectedUserId]);

  async function refreshUsers() {
    const result = await fetchJson<User[]>(`${API_URL}/users`);
    setUsers(result);
    if (result.length > 0 && !selectedUserId) {
      setSelectedUserId(result[0].id);
    }
  }

  async function refreshWorkspaces() {
    const result = await fetchJson<Workspace[]>(`${API_URL}/workspaces`);
    setWorkspaces(result);
    if (result.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(result[0].id);
    }
  }

  async function refreshConversations(workspaceId: string) {
    const result = await fetchJson<Conversation[]>(
      `${API_URL}/workspaces/${workspaceId}/conversations`,
    );
    setConversations(result);

    if (result.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    const stillSelected = result.some((conversation) => conversation.id === selectedConversationId);
    if (!stillSelected) {
      setSelectedConversationId(result[0].id);
    }
  }

  async function refreshConversationCards(userId: string) {
    const result = await fetchJson<ConversationCard[]>(
      `${API_URL}/users/${userId}/conversation-cards`,
    );
    setConversationCards(result);
  }

  async function refreshMessages(conversationId: string) {
    const result = await fetchJson<Message[]>(
      `${API_URL}/conversations/${conversationId}/messages`,
    );
    setMessages(result);
  }

  async function createUser() {
    const name = window.prompt("New user name")?.trim();
    if (!name) return;

    await postJson(`${API_URL}/users`, { name });
    await refreshUsers().catch(console.error);
  }

  async function createWorkspace() {
    const name = window.prompt("New workspace name")?.trim();
    if (!name) return;

    await postJson<{ id: string }>(`${API_URL}/workspaces`, { name });
    await refreshWorkspaces().catch(console.error);
  }

  async function createConversation() {
    if (!selectedWorkspaceId) {
      window.alert("Select a workspace first.");
      return;
    }

    const title = window.prompt("New conversation title")?.trim();
    if (!title) return;

    const created = await postJson<{ id: string }>(
      `${API_URL}/workspaces/${selectedWorkspaceId}/conversations`,
      { title },
    );

    if (selectedUserId) {
      await postJson(`${API_URL}/conversations/${created.id}/join`, { userId: selectedUserId });
      await refreshConversationCards(selectedUserId);
    }

    await refreshConversations(selectedWorkspaceId);
    setSelectedConversationId(created.id);
  }

  async function sendMessage() {
    if (!selectedConversationId) {
      window.alert("Select a conversation first.");
      return;
    }

    if (!selectedUserId) {
      window.alert("Select a user first.");
      return;
    }

    const text = messageInput.trim();
    if (!text) return;

    const selectedConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
    const isMember = selectedConversation?.members.includes(selectedUserId);

    if (!isMember) {
      await postJson(`${API_URL}/conversations/${selectedConversationId}/join`, {
        userId: selectedUserId,
      });
      await refreshConversations(selectedWorkspaceId!);
    }

    await postJson(`${API_URL}/conversations/${selectedConversationId}/messages`, {
      senderId: selectedUserId,
      text,
    });

    setMessageInput("");
    await refreshMessages(selectedConversationId);
    await refreshConversationCards(selectedUserId);
  }

  async function joinConversation(conversationId: string) {
    if (!selectedUserId) {
      window.alert("Select a user first.");
      return;
    }

    await postJson(`${API_URL}/conversations/${conversationId}/join`, {
      userId: selectedUserId,
    });

    if (selectedWorkspaceId) {
      await refreshConversations(selectedWorkspaceId);
    }
    await refreshConversationCards(selectedUserId);
    setSelectedConversationId(conversationId);
  }

  useEffect(() => {
    refreshUsers().catch(console.error);
    refreshWorkspaces().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setConversations([]);
      setSelectedConversationId(null);
      return;
    }

    refreshConversations(selectedWorkspaceId).catch(console.error);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedUserId) {
      setConversationCards([]);
      return;
    }

    refreshConversationCards(selectedUserId).catch(console.error);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    refreshMessages(selectedConversationId).catch(console.error);
  }, [selectedConversationId]);

  return (
    <Theme appearance="light" accentColor="amber" grayColor="sand" radius="large" scaling="100%">
      <Box className="app-shell">
        <Flex align="center" justify="between" className="app-header">
          <Heading size="7">Event Bus Console</Heading>
          <Badge color="brown" size="2" radius="full">
            Radix + React
          </Badge>
        </Flex>

        <Box className="panel-grid">
          <Panel title="Users" onAdd={createUser} addLabel="Create user">
            {users.map((user) => (
              <ItemButton
                key={user.id}
                active={selectedUserId === user.id}
                onClick={() => setSelectedUserId(user.id)}
                title={user.name}
                subtitle={user.id}
              />
            ))}
          </Panel>

          <Panel title="Workspaces" onAdd={createWorkspace} addLabel="Create workspace">
            {workspaces.map((workspace) => (
              <ItemButton
                key={workspace.id}
                active={selectedWorkspaceId === workspace.id}
                onClick={() => setSelectedWorkspaceId(workspace.id)}
                title={workspace.name}
                subtitle={workspace.id}
              />
            ))}
          </Panel>

          <Panel
            title="Conversation Cards"
            onAdd={createConversation}
            addLabel="Create conversation"
          >
            {visibleConversations.map((conversation) => (
              <ConversationItem
                key={conversation.conversationId}
                active={selectedConversationId === conversation.conversationId}
                joined={conversation.joined}
                onSelect={() => {
                  if (conversation.joined) {
                    setSelectedConversationId(conversation.conversationId);
                  }
                }}
                onJoin={() => void joinConversation(conversation.conversationId)}
                title={conversation.title}
                subtitle={conversation.subtitle}
              />
            ))}
          </Panel>

          <Panel title="Messages" onAdd={sendMessage} addLabel="Send message">
            <Flex direction="column" className="messages-panel">
              <Text color="gray" size="2">
                {activeConversation ? activeConversation.title : "Select a conversation"}
              </Text>
              <Separator size="4" />
              <ScrollArea type="always" scrollbars="vertical" className="messages-list">
                <Flex direction="column" gap="2">
                  {messages.map((message) => (
                    <Card key={message.id} className="message-card">
                      <Flex justify="between" align="center">
                        <Text size="2" weight="bold">
                          {displayUserName(users, message.senderId)}
                        </Text>
                        <Text size="1" color="gray">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Text>
                      </Flex>
                      <Text size="2">{message.text}</Text>
                    </Card>
                  ))}
                </Flex>
              </ScrollArea>
              <Flex gap="2">
                <TextField.Root
                  placeholder="Send a message"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button onClick={() => void sendMessage()}>
                  <PaperPlaneIcon />
                </Button>
              </Flex>
            </Flex>
          </Panel>
        </Box>
      </Box>
    </Theme>
  );
}

function Panel({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <Card className="panel-card">
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">{title}</Heading>
        <Button variant="soft" size="1" onClick={() => void onAdd()} aria-label={addLabel}>
          <PlusIcon />
        </Button>
      </Flex>
      <ScrollArea type="always" scrollbars="vertical" className="panel-scroll">
        <Flex direction="column" gap="2">
          {children}
        </Flex>
      </ScrollArea>
    </Card>
  );
}

function ItemButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button className={`list-item ${active ? "active" : ""}`} onClick={onClick} type="button">
      <Text weight="bold" size="2">
        {title}
      </Text>
      <Text size="1" color="gray" className="subtitle-text">
        {subtitle}
      </Text>
    </button>
  );
}

function ConversationItem({
  active,
  joined,
  onSelect,
  onJoin,
  title,
  subtitle,
}: {
  active: boolean;
  joined: boolean;
  onSelect: () => void;
  onJoin: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      className={`list-item ${active ? "active" : ""} ${joined ? "" : "muted"}`}
      onClick={onSelect}
      type="button"
    >
      <Flex align="start" justify="between" width="100%" gap="3">
        <Flex direction="column" align="start" gap="1" width="100%">
          <Text weight="bold" size="2">
            {title}
          </Text>
          <Text size="1" color="gray" className="subtitle-text">
            {subtitle}
          </Text>
        </Flex>
        {!joined ? (
          <Button
            size="1"
            variant="soft"
            onClick={(event) => {
              event.stopPropagation();
              onJoin();
            }}
          >
            Join
          </Button>
        ) : null}
      </Flex>
    </button>
  );
}

function displayUserName(users: User[], userId: string): string {
  const user = users.find((candidate) => candidate.id === userId);
  return user ? user.name : userId;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export default App;
