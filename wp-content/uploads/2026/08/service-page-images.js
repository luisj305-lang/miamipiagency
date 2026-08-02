(() => {
  const pages = {
    'page-id-544': [
      ['rawpixel-594763-unsplash', 'asset-searches-investigator.webp', 1322, 1190, 'Private investigator conducting a lawful asset search'],
      ['mpa-c8072d2a', 'asset-searches-consultation.webp', 1619, 971, 'Confidential asset search consultation with an investigator and client'],
      ['Approach-scaled-1', 'asset-searches-record-research.webp', 1536, 1024, 'Investigator verifying property, corporate, and financial records'],
      ['mpa-6fdb795e', 'asset-searches-record-research.webp', 1536, 1024, 'Methodical asset-search research using public records']
    ],
    'page-id-5660': [
      ['mpa-7a16a4f1', 'blackmail-extortion-response.webp', 1322, 1190, 'Private investigator responding discreetly to a digital blackmail case'],
      ['mpa-bef018fb', 'blackmail-confidential-support.webp', 1250, 1250, 'Confidential consultation with a blackmail investigation client'],
      ['mpa-ff12da48', 'blackmail-digital-evidence.webp', 1536, 1024, 'Investigator preserving digital evidence in an extortion investigation'],
      ['mpa-1a70fec9', 'blackmail-resolution-strategy.webp', 1536, 1024, 'Investigator and attorney planning a confidential extortion response'],
      ['mpa-c8072d2a', 'blackmail-resolution-strategy.webp', 1536, 1024, 'Confidential legal and investigative strategy session'],
      ['Approach-scaled-1', 'blackmail-digital-evidence.webp', 1536, 1024, 'Digital evidence review for a blackmail investigation'],
      ['mpa-6fdb795e', 'blackmail-resolution-strategy.webp', 1536, 1024, 'Professional strategy for resolving a blackmail case'],
      ['Database-scaled-1', 'blackmail-digital-evidence.webp', 1536, 1024, 'Digital-forensics investigator documenting case evidence'],
      ['mpa-96a7c156', 'blackmail-resolution-strategy.webp', 1536, 1024, 'Private investigation team planning a lawful resolution']
    ]
  };

  const pageAssets = Object.entries(pages).find(([pageClass]) => document.body.classList.contains(pageClass))?.[1];
  if (!pageAssets) return;

  const replaceImages = () => {
    document.querySelectorAll('.post-content img').forEach((image) => {
      const sources = [image.currentSrc, image.src, image.dataset.origSrc].filter(Boolean).join(' ');
      const asset = pageAssets.find(([match]) => sources.includes(match));
      if (!asset) return;

      const [, fileName, width, height, alt] = asset;
      const src = `/wp-content/uploads/2026/08/${fileName}`;
      image.src = src;
      image.dataset.origSrc = src;
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.removeAttribute('data-orig-srcset');
      image.width = width;
      image.height = height;
      image.alt = alt;
      image.title = alt;
      image.style.objectPosition = 'center center';
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceImages, { once: true });
  } else {
    replaceImages();
  }
})();
