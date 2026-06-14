import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, firebaseMessagingVapidKey, messagingPromise } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]); const [status, setStatus] = useState('');
  useEffect(() => onSnapshot(query(collection(db, 'notifications'), where('toUid','==',user.uid), orderBy('createdAt','desc')), snap => setItems(snap.docs.map(d=>({ id:d.id, ...d.data() }))), []);
  useEffect(() => { let unsub; messagingPromise.then((m) => { if (m) unsub = onMessage(m, payload => setStatus(payload.notification?.title || 'New foreground notification')); }); return () => unsub?.(); }, []);
  async function enable() { try { const reg = await navigator.serviceWorker.register('/booterspace/firebase-messaging-sw.js'); const messaging = await messagingPromise; if (!messaging) return setStatus('Messaging unsupported in this browser.'); const token = await getToken(messaging, { vapidKey: firebaseMessagingVapidKey, serviceWorkerRegistration: reg }); await setDoc(doc(db, 'users', user.uid), { fcmToken: token, notificationsEnabled: true, notificationUpdatedAt: serverTimestamp() }, { merge: true }); setStatus('Browser notifications enabled.'); } catch (error) { setStatus(error.message); } }
  return <section className="container-shell py-10"><div className="card space-y-4 p-6"><h1 className="text-3xl font-black">Notifications</h1><button onClick={enable} className="btn-primary">Enable browser notifications</button>{status && <p>{status}</p>}{items.map(n=><article key={n.id} className="rounded-xl border p-4"><p className="font-semibold">{n.message}</p>{!n.read && <button className="mt-2 text-sm text-brand-600" onClick={()=>updateDoc(doc(db,'notifications',n.id),{read:true})}>Mark read</button>}</article>)}</div></section>;
}
