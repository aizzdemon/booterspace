import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => onSnapshot(query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(50)), (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))), []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  async function send(e) { e.preventDefault(); if (!text.trim()) return; await addDoc(collection(db, 'messages'), { text: text.trim(), userId: user.uid, userName: user.displayName || user.email, timestamp: serverTimestamp() }); setText(''); }
  return <section className="container-shell py-8"><div className="card mx-auto flex h-[72vh] max-w-4xl flex-col overflow-hidden"><div className="border-b p-4"><h1 className="text-2xl font-black">Messages</h1><p className="text-sm text-slate-500">Realtime Firestore chat.</p></div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-100 p-4">{messages.map(m=><div key={m.id} className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.userId===user.uid?'ml-auto bg-brand-600 text-white':'bg-white text-slate-800'}`}><p>{m.text}</p><p className="mt-1 text-xs opacity-70">{m.userName || m.userId}</p></div>)}<div ref={endRef}/></div><form onSubmit={send} className="flex gap-3 border-t p-4"><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…"/><button className="btn-primary">Send</button></form></div></section>;
}
