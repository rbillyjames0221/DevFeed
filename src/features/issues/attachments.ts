export interface AttachmentItem {
  id: string;
  url: string;
  name: string;
  isImage: boolean;
  isPdf: boolean;
}

export function isImageSource(urlOrName: string): boolean {
  if (!urlOrName) return false;
  return (
    urlOrName.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(urlOrName)
  );
}

export function isPdfSource(urlOrName: string): boolean {
  if (!urlOrName) return false;
  return /\.pdf(\?.*)?$/i.test(urlOrName);
}

export function cleanAttachmentName(rawName: string, url: string): string {
  if (rawName && rawName.trim().length > 0) {
    return rawName.trim();
  }
  try {
    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;
    const base = pathname.split('/').pop() || 'attachment';
    // Remove generated timestamp prefixes like 1723456789-abc-
    return base.replace(/^\d+-[a-z0-9]+-/, '');
  } catch {
    const base = url.split('/').pop() || 'attachment';
    return base.replace(/^\d+-[a-z0-9]+-/, '');
  }
}

/**
 * Formats a PDF name ensuring at least `minChars` (default 10) are visible,
 * plus the `.pdf` extension.
 */
export function formatPdfDisplayName(name: string, minChars = 10, maxChars = 14): string {
  const isPdf = /\.pdf$/i.test(name);
  const base = isPdf ? name.replace(/\.pdf$/i, '') : name;
  const ext = isPdf ? '.pdf' : '';

  if (base.length <= Math.max(minChars, maxChars)) {
    return `${base}${ext}`;
  }

  // Ensure at least minChars (10 chars) are shown before the ellipsis
  const visible = base.slice(0, Math.max(minChars, maxChars));
  return `${visible}…${ext}`;
}

export function extractAttachments(text: string | null | undefined): {
  images: AttachmentItem[];
  pdfs: AttachmentItem[];
  files: AttachmentItem[];
  all: AttachmentItem[];
} {
  if (!text) {
    return { images: [], pdfs: [], files: [], all: [] };
  }

  const seenUrls = new Set<string>();
  const all: AttachmentItem[] = [];

  // 1. Markdown images: ![alt](url)
  const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdImageRegex.exec(text)) !== null) {
    const alt = match[1];
    const url = match[2].trim().replace(/^<|>$/g, '');
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      all.push({
        id: `img-${all.length}`,
        url,
        name: cleanAttachmentName(alt, url),
        isImage: true,
        isPdf: false
      });
    }
  }

  // 2. HTML <img> tags
  const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImgRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      all.push({
        id: `html-img-${all.length}`,
        url,
        name: cleanAttachmentName('', url),
        isImage: true,
        isPdf: false
      });
    }
  }

  // 3. Markdown links: [text](url) - negative lookbehind for !
  const mdLinkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    const linkText = match[1];
    const url = match[2].trim().replace(/^<|>$/g, '');
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const isImg = isImageSource(url) || isImageSource(linkText);
      const isPdf = isPdfSource(url) || isPdfSource(linkText);
      all.push({
        id: `link-${all.length}`,
        url,
        name: cleanAttachmentName(linkText, url),
        isImage: isImg,
        isPdf: isPdf
      });
    }
  }

  const images = all.filter((item) => item.isImage);
  const pdfs = all.filter((item) => item.isPdf);
  const files = all.filter((item) => !item.isImage);

  return { images, pdfs, files, all };
}
