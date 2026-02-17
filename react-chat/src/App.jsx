import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import { auth, db } from './firebaseClient';
import {
  acceptConnectionRequest,
  saveContactPhone,
  sendConnectionRequest,
  sendMessage,
  subscribeToConversations,
  subscribeToDiscoverUsers,
  subscribeToIncomingRequests,
  subscribeToMessages,
  subscribeToOutgoingRequests,
  subscribeToSavedContacts,
  upsertCurrentUserProfile,
} from './firebaseChatApi';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [savedPhones, setSavedPhones] = useState({});
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await upsertCurrentUserProfile({
          db,
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
        return;
      }

      try {
        const credential = await signInAnonymously(auth);
        setCurrentUser(credential.user);
        await upsertCurrentUserProfile({
          db,
          uid: credential.user.uid,
          displayName: 'Anonymous User',
          email: '',
        });
      } catch (authError) {
        setError(authError.message);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    const unsubscribers = [
      subscribeToDiscoverUsers({ db, uid: currentUser.uid, onData: setDirectoryUsers, onError: (e) => setError(e.message) }),
      subscribeToIncomingRequests({ db, uid: currentUser.uid, onData: setIncomingRequests, onError: (e) => setError(e.message) }),
      subscribeToOutgoingRequests({ db, uid: currentUser.uid, onData: setOutgoingRequests, onError: (e) => setError(e.message) }),
      subscribeToConversations({ db, uid: currentUser.uid, onData: setConversations, onError: (e) => setError(e.message) }),
      subscribeToSavedContacts({ db, uid: currentUser.uid, onData: setSavedPhones, onError: (e) => setError(e.message) }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!selectedConversationId) {
      if (conversations.length > 0) {
        setSelectedConversationId(conversations[0].id);
      }
      return undefined;
    }

    return subscribeToMessages({
      db,
      conversationId: selectedConversationId,
      onData: setMessages,
      onError: (e) => setError(e.message),
    });
  }, [selectedConversationId, conversations]);

  const acceptedContactIds = useMemo(() => {
    const ids = new Set();
    conversations.forEach((conversation) => {
      const otherId = conversation.participantIds?.find((id) => id !== currentUser?.uid);
      if (otherId) ids.add(otherId);
    });
    return ids;
  }, [conversations, currentUser?.uid]);

  const connectedContacts = useMemo(() => {
    return directoryUsers
      .filter((user) => acceptedContactIds.has(user.id))
      .map((user) => ({
        ...user,
        savedPhone: savedPhones[user.id] || '',
      }));
  }, [directoryUsers, acceptedContactIds, savedPhones]);

  const discoverableUsers = useMemo(() => {
    const outgoing = new Set(outgoingRequests.map((request) => request.toUserId));
    return directoryUsers.filter((user) => !acceptedContactIds.has(user.id) && !outgoing.has(user.id));
  }, [directoryUsers, acceptedContactIds, outgoingRequests]);

  const filteredContacts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return connectedContacts;

    return connectedContacts.filter((contact) => {
      const name = (contact.displayName || 'User').toLowerCase();
      const phone = (contact.savedPhone || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [connectedContacts, searchQuery]);

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId);
  const selectedContact = selectedConversation
    ? connectedContacts.find((contact) => selectedConversation.participantIds?.includes(contact.id))
    : null;

  const handleRequestConnection = async (user) => {
    if (!currentUser?.uid) return;
    try {
      await sendConnectionRequest({
        db,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email || 'Anonymous',
        toUserId: user.id,
        toUserName: user.displayName || user.email || 'User',
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (!currentUser?.uid) return;
    try {
      const conversationId = await acceptConnectionRequest({
        db,
        requestId,
        currentUserId: currentUser.uid,
      });
      if (conversationId) setSelectedConversationId(conversationId);
    } catch (acceptError) {
      setError(acceptError.message);
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedConversationId || !currentUser?.uid) return;
    try {
      await sendMessage({
        db,
        conversationId: selectedConversationId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || 'Anonymous',
        text,
      });
    } catch (sendError) {
      setError(sendError.message);
    }
  };

  const handleSaveNumber = async (contactId, phone) => {
    if (!currentUser?.uid) return;
    try {
      await saveContactPhone({ db, uid: currentUser.uid, contactId, phone });
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <div className="whatsapp-layout">
      <ChatSidebar
        currentUser={currentUser}
        contacts={filteredContacts}
        discoverableUsers={discoverableUsers}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
        selectedConversationId={selectedConversationId}
        conversations={conversations}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectConversation={setSelectedConversationId}
        onRequestConnection={handleRequestConnection}
        onAcceptRequest={handleAcceptRequest}
      />

      <ChatWindow
        currentUser={currentUser}
        contact={selectedContact}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSaveNumber={handleSaveNumber}
        error={error}
      />
    </div>
  );
}
