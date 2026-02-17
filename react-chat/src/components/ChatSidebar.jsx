function conversationPreview(conversation) {
  return conversation?.lastMessageText || 'Start conversation';
}

function conversationTime(conversation) {
  return conversation?.updatedAt?.toDate ? conversation.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
}

export default function ChatSidebar({
  currentUser,
  contacts,
  discoverableUsers,
  incomingRequests,
  outgoingRequests,
  selectedConversationId,
  conversations,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onRequestConnection,
  onAcceptRequest,
}) {
  const convByContact = new Map();
  conversations.forEach((conversation) => {
    const contactId = conversation.participantIds?.find((id) => id !== currentUser?.uid);
    if (contactId) convByContact.set(contactId, conversation);
  });

  return (
    <aside className="sidebar">
      <div className="profile-row">
        <strong>{currentUser?.displayName || currentUser?.email || 'Loading user...'}</strong>
        <p>{currentUser?.uid || 'Authenticating with Firebase...'}</p>
      </div>

      <div className="request-section">
        <h2>Incoming Requests</h2>
        {incomingRequests.length === 0 ? (
          <p className="empty-state">No pending requests.</p>
        ) : (
          <ul className="request-list">
            {incomingRequests.map((request) => (
              <li key={request.id}>
                <span>{request.fromUserName || request.fromUserId}</span>
                <button type="button" onClick={() => onAcceptRequest(request.id)}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="request-section">
        <h2>Find People</h2>
        {discoverableUsers.length === 0 ? (
          <p className="empty-state">No users available.</p>
        ) : (
          <ul className="request-list">
            {discoverableUsers.map((user) => (
              <li key={user.id}>
                <span>{user.displayName || user.email || user.id}</span>
                <button type="button" onClick={() => onRequestConnection(user)}>
                  Request
                </button>
              </li>
            ))}
          </ul>
        )}
        {outgoingRequests.length > 0 ? (
          <p className="pending-note">Pending sent: {outgoingRequests.length}</p>
        ) : null}
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
            const conversation = convByContact.get(contact.id);
            if (!conversation) return null;
            return (
              <button
                key={contact.id}
                type="button"
                className={`contact-card ${selectedConversationId === conversation.id ? 'active' : ''}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="contact-top-row">
                  <span>{contact.displayName || contact.email || contact.id}</span>
                  <time>{conversationTime(conversation)}</time>
                </div>
                <p>{conversationPreview(conversation)}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
