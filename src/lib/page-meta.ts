import { useEffect } from 'react';

const DEFAULT_OG_IMAGE = '/brand/logo-zenleader.png';

type AdminPageMeta = {
  title: string;
  description: string;
};

function upsertMeta(
  selector: string,
  attribute: 'name' | 'property',
  value: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

export function applyPageMeta({ title, description }: AdminPageMeta) {
  document.title = title;

  upsertMeta('meta[name="description"]', 'name', 'description', description);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Zen Leader Admin');
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', DEFAULT_OG_IMAGE);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', DEFAULT_OG_IMAGE);
}

export function useAdminPageMeta(meta: AdminPageMeta) {
  useEffect(() => {
    applyPageMeta(meta);
  }, [meta.description, meta.title]);
}
