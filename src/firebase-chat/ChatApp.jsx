import { useEffect, useMemo, useState } from 'react';
import {
  sendMessage,
  subscribeToConnections,
  subscribeToMessages,
  subscribeToNotifications,
  subscribeToUserChats,
} from './firebaseChatApi';
import './ChatApp.css';

function ChatList({ chats, selectedChatId, onSelectChat, currentUserId }) {
  return (
    <aside className="chat-list">
      <h2>Chats</h2>
      {chats.length === 0 ? (
        <p className="muted">No conversations yet.</p>
      ) : (
        chats.map((chat) => {
          const title =
            chat.title ||
            chat.participantNames?.find((name, index) => chat.participantIds?.[index] !== currentUserId) ||
            'Untitled Chat';

          return (
            <button
              key={chat.id}
              type="button"
              className={`chat-list-item ${selectedChatId === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <span className="chat-title">{title}</span>
              <span className="chat-preview">{chat.lastMessageText || 'Start the conversation'}</span>
            </button>
          );
        })
      )}
    </aside>
  );
}

function MessageList({ messages, currentUserId }) {
  return (
    <div className="message-list">
      {messages.map((message) => {
        const ownMessage = message.senderId === currentUserId;
        return (
          <div key={message.id} className={`message-bubble ${ownMessage ? 'outgoing' : 'incoming'}`}>
            <div className="message-meta">
              <strong>{ownMessage ? 'You' : message.senderName || 'User'}</strong>
            </div>
            <p>{message.text}</p>
          </div>
        );
      })}
    </div>
  );
}

function MessageComposer({ onSend }) {
  const [draft, setDraft] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    await onSend(draft);
    setDraft('');
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write a message"
        aria-label="Write a message"
      />
      <button type="submit">Send</button>
    </form>
  );
}

function ConnectionPanel({ connections, notifications }) {
  return (
    <aside className="connections-panel">
      <h2>Connected Users</h2>
      {connections.length === 0 ? (
        <p className="muted">No accepted connections.</p>
      ) : (
        <ul>
          {connections.map((item) => (
            <li key={item.id}>{item.displayName || item.toUserName || item.fromUserName || item.id}</li>
          ))}
        </ul>
      )}

      <h3>Notifications</h3>
      {notifications.length === 0 ? (
        <p className="muted">No new connection requests.</p>
      ) : (
        <ul>
          {notifications.map((item) => (
            <li key={item.id}>New request from {item.fromUserName || item.fromUserId}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default function ChatApp({ db, appId, currentUser }) {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [connections, setConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId),
    [chats, selectedChatId]
  );

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    return subscribeToUserChats({
      db,
      appId,
      uid: currentUser.uid,
      onData: (nextChats) => {
        setChats(nextChats);
        if (!selectedChatId && nextChats.length > 0) {
          setSelectedChatId(nextChats[0].id);
        }
      },
      onError: (subscribeError) => setError(subscribeError.message),
    });
  }, [appId, currentUser?.uid, db, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return undefined;
    }

    return subscribeToMessages({
      db,
      appId,
      chatId: selectedChatId,
      onData: setMessages,
      onError: (subscribeError) => setError(subscribeError.message),
    });
  }, [appId, db, selectedChatId]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    return subscribeToConnections({
      db,
      appId,
      uid: currentUser.uid,
      onData: setConnections,
      onError: (subscribeError) => setError(subscribeError.message),
    });
  }, [appId, currentUser?.uid, db]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    return subscribeToNotifications({
      db,
      appId,
      uid: currentUser.uid,
      onData: setNotifications,
      onError: (subscribeError) => setError(subscribeError.message),
    });
  }, [appId, currentUser?.uid, db]);

  const handleSendMessage = async (text) => {
    if (!selectedChatId || !currentUser?.uid) return;

    await sendMessage({
      db,
      appId,
      chatId: selectedChatId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email || 'Anonymous',
      text,
    });
  };

  return (
    <section className="chat-layout">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        currentUserId={currentUser?.uid}
      />

      <main className="chat-thread">
        <header>
          <h1>{selectedChat?.title || 'Select a conversation'}</h1>
          {error ? <p className="error-text">{error}</p> : null}
        </header>

        <MessageList messages={messages} currentUserId={currentUser?.uid} />
        <MessageComposer onSend={handleSendMessage} />
      </main>

      <ConnectionPanel connections={connections} notifications={notifications} />
    </section>
  );
}
