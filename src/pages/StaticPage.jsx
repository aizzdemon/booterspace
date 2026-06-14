import { useEffect } from 'react';
import PageHero from '../components/PageHero';
import { setSeo } from '../lib/seo';

const pages = {
  govt: ['Government Jobs', 'Track government opportunities, recruitment notices, eligibility details, and application deadlines.'],
  community: ['Community', 'Connect with BooterSpace members, share career resources, and grow your professional network.'],
  companies: ['Company Culture', 'Explore companies, workplace expectations, interview preparation, and employer information.'],
  hangout: ['Places to Hangout', 'Discover cafes, malls, restaurants, and community places for productive breaks and meetups.'],
  books: ['Buy Books Online', 'Find learning resources, exam-prep books, and career-growth reading recommendations.'],
  resume: ['Premium Career Workspace & Resume Tailor', 'Prepare resumes, tailor applications, and organize career materials.'],
  reviews: ['Company Reviews', 'Read and share workplace insights to make informed career decisions.'],
  connection: ['ConnectionSpace', 'Build meaningful professional connections inside the BooterSpace ecosystem.'],
  about: ['About BooterSpace', 'BooterSpace helps job seekers and professionals connect with opportunities and career resources.']
};

export default function StaticPage({ slug }) {
  const [title, description] = pages[slug] || ['BooterSpace', 'Career resources and community tools.'];
  useEffect(() => setSeo({ title: `${title} – BooterSpace`, description, canonicalPath: `/${slug}` }), [slug, title, description]);
  return <><PageHero eyebrow="BooterSpace" title={title}><p>{description}</p></PageHero><section className="container-shell py-12"><div className="card p-8"><h2 className="text-2xl font-black">Migrated React content</h2><p className="mt-3 text-slate-600">This route preserves the SEO-critical purpose of the original <code>{slug}.html</code> page while the React app centralizes navigation, styling, and Firebase integrations. Legacy HTML remains in the repository as migration reference and rollback support.</p></div></section></>;
}
