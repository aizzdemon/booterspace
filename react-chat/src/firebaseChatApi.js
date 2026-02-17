import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const usersCollection = (db) => collection(db, 'chat_users');
const userDoc = (db, uid) => doc(db, 'chat_users', uid);
const contactsCollection = (db, uid) => collection(db, 'chat_users', uid, 'contacts');
const contactDoc = (db, uid, contactId) => doc(db, 'chat_users', uid, 'contacts', contactId);
const requestsCollection = (db) => collection(db, 'chat_connection_requests');
const requestDoc = (db, requestId) => doc(db, 'chat_connection_requests', requestId);
const conversationsCollection = (db) => collection(db, 'chat_conversations');
const conversationDoc = (db, conversationId) => doc(db, 'chat_conversations', conversationId);
const messagesCollection = (db, conversationId) => collection(db, 'chat_conversations', conversationId, 'messages');

export const conversationIdForUsers = (a, b) => [a, b].sort().join('_');

export async function upsertCurrentUserProfile({ db, uid, displayName, email }) {
  if (!uid) return;
  await setDoc(
    userDoc(db, uid),
    {
      displayName: displayName || email || 'User',
      email: email || '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToDiscoverUsers({ db, uid, onData, onError }) {
  return onSnapshot(
    usersCollection(db),
    (snapshot) => {
      const users = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.id !== uid);
      onData(users);
    },
    onError
  );
}

export function subscribeToIncomingRequests({ db, uid, onData, onError }) {
  const q = query(requestsCollection(db), where('toUserId', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeToOutgoingRequests({ db, uid, onData, onError }) {
  const q = query(requestsCollection(db), where('fromUserId', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function sendConnectionRequest({ db, fromUserId, fromUserName, toUserId, toUserName }) {
  const requestId = conversationIdForUsers(fromUserId, toUserId);

  await setDoc(
    requestDoc(db, requestId),
    {
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      participants: [fromUserId, toUserId],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function acceptConnectionRequest({ db, requestId, currentUserId }) {
  const requestRef = requestDoc(db, requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) return null;
  const request = requestSnap.data();

  await updateDoc(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  const otherUserId = request.fromUserId === currentUserId ? request.toUserId : request.fromUserId;
  const conversationId = conversationIdForUsers(currentUserId, otherUserId);
  const conversationRef = conversationDoc(db, conversationId);

  await setDoc(
    conversationRef,
    {
      participantIds: [currentUserId, otherUserId],
      participantNames: [request.fromUserName || request.fromUserId, request.toUserName || request.toUserId],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      lastMessageText: '',
    },
    { merge: true }
  );

  return conversationId;
}

export function subscribeToConversations({ db, uid, onData, onError }) {
  const q = query(conversationsCollection(db), where('participantIds', 'array-contains', uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeToMessages({ db, conversationId, onData, onError }) {
  if (!conversationId) return () => {};
  const q = query(messagesCollection(db, conversationId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function sendMessage({ db, conversationId, senderId, senderName, text }) {
  const value = text.trim();
  if (!value) return;

  await addDoc(messagesCollection(db, conversationId), {
    text: value,
    senderId,
    senderName,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    conversationDoc(db, conversationId),
    {
      lastMessageText: value,
      lastMessageSenderId: senderId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToSavedContacts({ db, uid, onData, onError }) {
  return onSnapshot(
    contactsCollection(db, uid),
    (snapshot) => {
      const map = {};
      snapshot.docs.forEach((item) => {
        map[item.id] = item.data().phone || '';
      });
      onData(map);
    },
    onError
  );
}

export async function saveContactPhone({ db, uid, contactId, phone }) {
  await setDoc(
    contactDoc(db, uid, contactId),
    {
      phone,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
