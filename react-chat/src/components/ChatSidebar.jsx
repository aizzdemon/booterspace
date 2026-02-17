function formatPreview(messages) {
  if (!messages?.length) return 'No messages yet. Say hello 👋';
  return messages[messages.length - 1].text;
}

function formatPreviewTime(messages) {
  if (!messages?.length) return '--:--';
  return messages[messages.length - 1].time;
}

export default function ChatSidebar({
  currentUser,
  contacts,
  pendingRequests,
  selectedContactId,
  messagesByContact,
  searchQuery,
  onSearchChange,
  onSelectContact,
  onAcceptRequest,
}) {
  return (
    <aside className="sidebar">
      <div className="profile-row">
        <div>
          <strong>{currentUser.name}</strong>
          <p>{currentUser.phone}</p>
        </div>
      </div>

      <div className="request-section">
        <h2>Connection Requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="empty-state">No pending requests.</p>
        ) : (
          <ul className="request-list">
            {pendingRequests.map((request) => (
              <li key={request.id}>
                <span>{request.fromUser.name}</span>
                <button type="button" onClick={() => onAcceptRequest(request.id)}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        className="search"
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search connected contacts"
      />

      <h2>Connected Contacts</h2>
      <div className="contact-list">
        {contacts.length === 0 ? (
          <p className="empty-state">No accepted connections to chat yet.</p>
        ) : (
          contacts.map((contact) => {
            const messages = messagesByContact[contact.id] || [];
            return (
              <button
                key={contact.id}
                type="button"
                className={`contact-card ${selectedContactId === contact.id ? 'active' : ''}`}
                onClick={() => onSelectContact(contact.id)}
              >
                <div className="contact-top-row">
                  <span>{contact.name}</span>
                  <time>{formatPreviewTime(messages)}</time>
                </div>
                <p>{formatPreview(messages)}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
