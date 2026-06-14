import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { setSeo } from '../lib/seo';

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setSeo({ title: 'Sign In - BooterSpace', canonicalPath: '/login' }), []);
  const next = params.get('next') || '/';
  async function submit(e) {
    e.preventDefault(); setBusy(true); setStatus('');
    try { await signInWithEmailAndPassword(auth, form.email, form.password); navigate(next); }
    catch (error) { setStatus(`Sign-in failed: ${error.message}`); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (!form.email) return setStatus('Enter your email before requesting a reset.');
    try { await sendPasswordResetEmail(auth, form.email); setStatus('Password reset email sent.'); }
    catch (error) { setStatus(`Reset failed: ${error.message}`); }
  }
  return <section className="container-shell flex min-h-[70vh] items-center justify-center py-12"><form onSubmit={submit} className="card w-full max-w-md space-y-4 p-8"><h1 className="text-3xl font-black">Sign in</h1><p className="text-slate-600">Access profiles, messages, notifications, and posting tools.</p><input className="input" type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /><input className="input" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /><button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button><button type="button" onClick={reset} className="w-full text-sm font-semibold text-brand-600">Forgot password?</button>{status && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{status}</p>}<p className="text-center text-sm text-slate-500">New here? <Link to="/signup">Create an account</Link></p></form></section>;
}
