export function setSeo({ title = 'BooterSpace', description, canonicalPath = '/' }) {
  document.title = title;
  const desc = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'));
  desc.setAttribute('name', 'description');
  desc.setAttribute('content', description || 'BooterSpace career, jobs, profiles, messages, and community workspace.');
  const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(document.createElement('link'));
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', `https://aizzdemon.github.io/booterspace${canonicalPath}`);
}
