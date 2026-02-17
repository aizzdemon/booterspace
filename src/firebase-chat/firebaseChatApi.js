import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export const conversationsCollection = (db, appId) =>
  collection(db, `artifacts/${appId}/public/data/conversations`);

export const conversationDoc = (db, appId, chatId) =>
  doc(db, `artifacts/${appId}/public/data/conversations/${chatId}`);

export const messagesCollection = (db, appId, chatId) =>
  collection(db, `artifacts/${appId}/public/data/conversations/${chatId}/messages`);

export const connectionRequestsCollection = (db, appId) =>
  collection(db, `artifacts/${appId}/public/data/connection_requests`);

export function subscribeToUserChats({ db, appId, uid, onData, onError }) {
  const q = query(
    conversationsCollection(db, appId),
    where('participantIds', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs.map((chatDoc) => ({
        id: chatDoc.id,
        ...chatDoc.data(),
      }));
      onData(chats);
    },
    onError
  );
}

export function subscribeToMessages({ db, appId, chatId, onData, onError }) {
  const q = query(
    messagesCollection(db, appId, chatId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));
      onData(messages);
    },
    onError
  );
}

export async function sendMessage({
  db,
  appId,
  chatId,
  senderId,
  senderName,
  text,
}) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const messagePayload = {
    text: trimmed,
    senderId,
    senderName,
    createdAt: serverTimestamp(),
  };

  await addDoc(messagesCollection(db, appId, chatId), messagePayload);

  await updateDoc(conversationDoc(db, appId, chatId), {
    lastMessageText: trimmed,
    lastMessageSenderId: senderId,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToConnections({ db, appId, uid, onData, onError }) {
  const q = query(
    connectionRequestsCollection(db, appId),
    where('status', '==', 'accepted'),
    where('participants', 'array-contains', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const connections = snapshot.docs.map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data(),
      }));
      onData(connections);
    },
    onError
  );
}

export function subscribeToNotifications({ db, appId, uid, onData, onError }) {
  const q = query(
    connectionRequestsCollection(db, appId),
    where('toUserId', '==', uid),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data(),
      }));
      onData(notifications);
    },
    onError
  );
}
