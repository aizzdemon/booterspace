# Firebase Chat React Components (v9 modular)

These components implement a Firestore-backed chat UI with these collections:

- `artifacts/{appId}/public/data/conversations/{chatId}`
- `artifacts/{appId}/public/data/conversations/{chatId}/messages`
- `artifacts/{appId}/public/data/connection_requests`

## Usage

```jsx
import { getFirestore } from 'firebase/firestore';
import ChatApp from './firebase-chat/ChatApp';

const db = getFirestore(firebaseApp);

export default function App({ user }) {
  return <ChatApp db={db} appId="my-app-id" currentUser={user} />;
}
```

## Expected document fields

### conversations/{chatId}

```json
{
  "title": "Project Team",
  "participantIds": ["uid-a", "uid-b"],
  "participantNames": ["Anita", "Bikram"],
  "lastMessageText": "hello",
  "updatedAt": "serverTimestamp"
}
```

### conversations/{chatId}/messages/{messageId}

```json
{
  "text": "Hi",
  "senderId": "uid-a",
  "senderName": "Anita",
  "createdAt": "serverTimestamp"
}
```

### connection_requests/{requestId}

```json
{
  "fromUserId": "uid-a",
  "fromUserName": "Anita",
  "toUserId": "uid-b",
  "toUserName": "Bikram",
  "participants": ["uid-a", "uid-b"],
  "status": "pending | accepted"
}
```
