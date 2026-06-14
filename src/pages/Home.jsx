import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import PageHero from '../components/PageHero';
import { setSeo } from '../lib/seo';

export default function Home() {
  useEffect(() => setSeo({ title: 'BooterSpace', canonicalPath: '/' }), []);
  const features = [
    ['Firebase Authentication', 'Secure accounts for job seekers, providers, and admins.'],
    ['Firestore Jobs', 'Curated private-sector jobs, pending review, and detailed job pages.'],
    ['Messaging', 'Realtime conversations for peers, recruiters, and employers.'],
    ['Profiles', 'Searchable career profiles with skills, college, company, and avatars.'],
    ['Browser Notifications', 'FCM-powered foreground and background updates.'],
    ['Community', 'Company culture, reviews, hangout places, books, and resume resources.']
  ];
  return (
    <>
      <PageHero
        eyebrow="React + Vite career workspace"
        title="Find jobs, build your profile, and connect faster."
        actions={<><Link to="/jobs" className="btn-primary bg-white text-brand-700 hover:bg-blue-50">Browse jobs</Link><Link to="/signup" className="btn-secondary border-white/40 bg-white/10 text-white hover:bg-white/20">Create account</Link></>}
      >
        BooterSpace is now a modern React application preserving Firebase Auth, Firestore, messaging, notifications, job posting, profiles, and admin workflows.
      </PageHero>
      <section className="container-shell py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, text]) => <div key={title} className="card p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-slate-600">{text}</p></div>)}
        </div>
      </section>
    </>
  );
}
