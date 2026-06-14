import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { setSeo } from '../lib/seo';

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState('jobSeeker');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', gender:'', company:'', gst:'', pan:'' });
  useEffect(() => setSeo({ title: 'Sign Up | BooterSpace', canonicalPath: '/signup' }), []);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setStatus('Creating account…');
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const photoURL = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(form.email)}`;
      await updateProfile(cred.user, { displayName: form.name, photoURL });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name, email: form.email, phone: form.phone, role, gender: role === 'jobSeeker' ? form.gender : null,
        company: role === 'jobProvider' ? form.company : null, gstNumber: role === 'jobProvider' ? form.gst : null,
        companyPAN: role === 'jobProvider' ? form.pan : null, jobPostAccess: role === 'jobProvider' ? 'pending' : 'allowed',
        photoURL, avatar: photoURL, searchKeywords: `${form.name} ${form.email} ${form.company}`.toLowerCase().split(/\s+/).filter(Boolean), createdAt: serverTimestamp()
      }, { merge: true });
      navigate('/profile');
    } catch (error) { setStatus(error.message); }
  }
  return <section className="container-shell py-12"><form onSubmit={submit} className="card mx-auto max-w-2xl space-y-5 p-8"><h1 className="text-3xl font-black">Create your BooterSpace account</h1><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setRole('jobSeeker')} className={role==='jobSeeker'?'btn-primary':'btn-secondary'}>Job seeker</button><button type="button" onClick={()=>setRole('jobProvider')} className={role==='jobProvider'?'btn-primary':'btn-secondary'}>Job provider</button></div><div className="grid gap-4 sm:grid-cols-2"><input className="input" placeholder="Full name" value={form.name} onChange={change('name')} required/><input className="input" type="email" placeholder="Email" value={form.email} onChange={change('email')} required/><input className="input" placeholder="Phone" value={form.phone} onChange={change('phone')} required/><input className="input" type="password" placeholder="Password" value={form.password} onChange={change('password')} minLength="6" required/>{role==='jobSeeker' && <select className="input" value={form.gender} onChange={change('gender')} required><option value="">Select gender</option><option>Male</option><option>Female</option><option>Others</option></select>}{role==='jobProvider' && <><input className="input" placeholder="Company" value={form.company} onChange={change('company')} required/><input className="input" placeholder="GST number" value={form.gst} onChange={change('gst')} required/><input className="input" placeholder="Company PAN" value={form.pan} onChange={change('pan')} required/></>}</div>{role==='jobProvider' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Job posting access may require admin approval.</p>}<button className="btn-primary w-full">Create account</button>{status && <p className="text-sm text-slate-600">{status}</p>}</form></section>;
}
