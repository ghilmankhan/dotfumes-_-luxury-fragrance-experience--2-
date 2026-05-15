import { useEffect } from 'react';
import { appConfig } from '../lib/config';

type MetaOptions = {
  title: string;
  description: string;
  path?: string;
  ogType?: 'website' | 'product';
  robots?: 'index,follow' | 'noindex,nofollow';
};

const upsertMetaTag = (selector: string, attributes: Record<string, string>) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);

  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    tag?.setAttribute(key, value);
  });
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

const resolveCanonical = (path?: string) => {
  if (!path) {
    return `${window.location.origin}${window.location.pathname}`;
  }

  const configuredBase = appConfig.baseUrl || window.location.origin;
  const base = configuredBase.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const usePageMeta = ({
  title,
  description,
  path,
  ogType = 'website',
  robots = 'index,follow',
}: MetaOptions) => {
  useEffect(() => {
    document.title = title;
    upsertMetaTag('meta[name="description"]', { name: 'description', content: description });
    upsertMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    });
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type', content: ogType });

    const canonical = resolveCanonical(path);
    upsertCanonical(canonical);
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonical });
  }, [description, ogType, path, robots, title]);
};
