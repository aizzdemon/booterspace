import { useMemo, useState } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';

const currentUser = {
  id: 'u-you',
  name: 'You',
  phone: '+91 90000 12345',
};

const allUsers = [
  { id: 'u-anita', name: 'Anita Sharma', status: 'online' },
  { id: 'u-raj', name: 'Raj Verma', status: 'last seen 08:15' },
  { id: 'u-neha', name: 'Neha Patel', status: 'online' },
  { id: 'u-omar', name: 'Omar Khan', status: 'last seen yesterday' },
];

const initialConnectionRequests = [
  { id: 'req-1', fromUserId: 'u-anita', toUserId: 'u-you', status: 'accepted' },
  { id: 'req-2', fromUserId: 'u-neha', toUserId: 'u-you', status: 'accepted' },
  { id: 'req-3', fromUserId: 'u-raj', toUserId: 'u-you', status: 'pending' },
  { id: 'req-4', fromUserId: 'u-omar', toUserId: 'u-you', status: 'pending' },
];

const initialSavedNumbers = {
  'u-anita': '+91 90000 23456',
  'u-neha': '+91 90000 45678',
};

const initialMessagesByContact = {
  'u-anita': [
    { id: 1, senderId: 'u-anita', text: 'Hi! Did you check the brief?', time: '09:10' },
    { id: 2, senderId: 'u-you', text: 'Yes, will send comments in 10 mins.', time: '09:13' },
  ],
  'u-neha': [
    { id: 1, senderId: 'u-you', text: 'Hey Neha, can we talk at 5?', time: '10:20' },
    { id: 2, senderId: 'u-neha', text: 'Sure, ping me then 👍', time: '10:21' },
  ],
};

function getCurrentTime() {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export default function App() {
  const [connectionRequests, setConnectionRequests] = useState(initialConnectionRequests);
  const [savedNumbers, setSavedNumbers] = useState(initialSavedNumbers);
  const [messagesByContact, setMessagesByContact] = useState(initialMessagesByContact);
  const [searchQuery, setSearchQuery] = useState('');

  const acceptedContactIds = useMemo(
    () =>
      connectionRequests
        .filter((request) => request.toUserId === currentUser.id && request.status === 'accepted')
        .map((request) => request.fromUserId),
    [connectionRequests]
  );

  const acceptedContacts = useMemo(
    () =>
      acceptedContactIds
        .map((id) => allUsers.find((user) => user.id === id))
        .filter(Boolean)
        .map((contact) => ({ ...contact, phone: savedNumbers[contact.id] || '' })),
    [acceptedContactIds, savedNumbers]
  );

  const [selectedContactId, setSelectedContactId] = useState(acceptedContactIds[0] || '');

  const pendingRequests = useMemo(
    () =>
      connectionRequests
        .filter((request) => request.toUserId === currentUser.id && request.status === 'pending')
        .map((request) => ({
          ...request,
          fromUser: allUsers.find((user) => user.id === request.fromUserId),
        }))
        .filter((request) => request.fromUser),
    [connectionRequests]
  );

  const filteredContacts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return acceptedContacts;

    return acceptedContacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(term);
      const numberMatch = contact.phone?.toLowerCase().includes(term);
      const messageMatch = (messagesByContact[contact.id] || []).some((message) =>
        message.text.toLowerCase().includes(term)
      );
      return nameMatch || numberMatch || messageMatch;
    });
  }, [acceptedContacts, messagesByContact, searchQuery]);

  const selectedContact = acceptedContacts.find((contact) => contact.id === selectedContactId) || null;
  const selectedMessages = selectedContact ? messagesByContact[selectedContact.id] || [] : [];

  const handleAcceptRequest = (requestId) => {
    setConnectionRequests((current) => {
      const acceptedRequest = current.find((request) => request.id === requestId);
      if (acceptedRequest && !selectedContactId) {
        setSelectedContactId(acceptedRequest.fromUserId);
      }

      return current.map((request) =>
        request.id === requestId ? { ...request, status: 'accepted' } : request
      );
    });
  };

  const handleSelectContact = (contactId) => setSelectedContactId(contactId);

  const handleSaveNumber = (contactId, phone) => {
    setSavedNumbers((current) => ({
      ...current,
      [contactId]: phone,
    }));
  };

  const handleSendMessage = (text) => {
    if (!selectedContact) return;

    setMessagesByContact((current) => {
      const conversation = current[selectedContact.id] || [];
      const nextMessageId = conversation.length ? conversation[conversation.length - 1].id + 1 : 1;

      return {
        ...current,
        [selectedContact.id]: [
          ...conversation,
          {
            id: nextMessageId,
            senderId: currentUser.id,
            text,
            time: getCurrentTime(),
          },
        ],
      };
    });
  };

  return (
    <div className="whatsapp-layout">
      <ChatSidebar
        currentUser={currentUser}
        contacts={filteredContacts}
        pendingRequests={pendingRequests}
        selectedContactId={selectedContactId}
        messagesByContact={messagesByContact}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectContact={handleSelectContact}
        onAcceptRequest={handleAcceptRequest}
      />

      <ChatWindow
        currentUser={currentUser}
        contact={selectedContact}
        messages={selectedMessages}
        onSendMessage={handleSendMessage}
        onSaveNumber={handleSaveNumber}
      />
    </div>
  );
}
