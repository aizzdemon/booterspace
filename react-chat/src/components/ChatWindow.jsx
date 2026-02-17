import { useEffect, useState } from 'react';

export default function ChatWindow({ currentUser, contact, messages, onSendMessage, onSaveNumber }) {
  const [draft, setDraft] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    setPhoneInput(contact?.phone || '');
  }, [contact?.id, contact?.phone]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    onSendMessage(content);
    setDraft('');
  };

  const handleSavePhone = (event) => {
    event.preventDefault();
    if (!contact) return;
    onSaveNumber(contact.id, phoneInput.trim());
  };

  if (!contact) {
    return (
      <main className="chat-window">
        <p className="empty-state">Accept a connection request and pick a contact to start chatting.</p>
      </main>
    );
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <h1>{contact.name}</h1>
        <p>{contact.status}</p>
        <form className="save-phone" onSubmit={handleSavePhone}>
          <input
            type="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="Save mobile number"
          />
          <button type="submit">Save</button>
        </form>
      </header>

      <section className="chat-thread">
        {messages.length === 0 ? (
          <p className="empty-thread">This chat is empty. Send a first message.</p>
        ) : (
          messages.map((message) => {
            const outgoing = message.senderId === currentUser.id;
            return (
              <article key={message.id} className={`bubble ${outgoing ? 'outgoing' : 'incoming'}`}>
                <p>{message.text}</p>
                <time>{message.time}</time>
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
          placeholder={`Message ${contact.name}`}
        />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
