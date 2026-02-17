import { useEffect, useState } from 'react';

function messageTime(createdAt) {
  if (!createdAt?.toDate) return '';
  return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({ currentUser, contact, messages, onSendMessage, onSaveNumber, error }) {
  const [draft, setDraft] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    setPhoneInput(contact?.savedPhone || '');
  }, [contact?.id, contact?.savedPhone]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    await onSendMessage(content);
    setDraft('');
  };

  const handleSavePhone = async (event) => {
    event.preventDefault();
    if (!contact) return;
    await onSaveNumber(contact.id, phoneInput.trim());
  };

  if (!contact) {
    return (
      <main className="chat-window">
        <p className="empty-state">Accept a request in Firebase-backed data to begin chat.</p>
        {error ? <p className="error-text">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <h1>{contact.displayName || contact.email || contact.id}</h1>
        <p>Firebase UID: {contact.id}</p>
        <form className="save-phone" onSubmit={handleSavePhone}>
          <input
            type="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="Save mobile number"
          />
          <button type="submit">Save</button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </header>

      <section className="chat-thread">
        {messages.length === 0 ? (
          <p className="empty-thread">No messages yet. Send one; it will be written to Firestore.</p>
        ) : (
          messages.map((message) => {
            const outgoing = message.senderId === currentUser?.uid;
            return (
              <article key={message.id} className={`bubble ${outgoing ? 'outgoing' : 'incoming'}`}>
                <p>{message.text}</p>
                <time>{messageTime(message.createdAt)}</time>
              </article>
            );
          })
        )}
      </section>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${contact.displayName || contact.email || 'contact'}`}
        />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
