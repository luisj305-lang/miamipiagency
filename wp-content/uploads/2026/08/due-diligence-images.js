(() => {
  const assets = [
    {
      match: 'mpa-811ef761',
      src: '/wp-content/uploads/2026/08/due-diligence-background-investigation.webp',
      width: 1196,
      height: 1315,
      alt: 'Private investigator reviewing corporate records during a due diligence investigation'
    },
    {
      match: 'mpa-c8072d2a',
      src: '/wp-content/uploads/2026/08/due-diligence-confidential-consultation.webp',
      width: 1619,
      height: 971,
      alt: 'Confidential due diligence consultation with an investigator, attorney, and business client'
    },
    {
      match: 'mpa-ec1f90f9',
      src: '/wp-content/uploads/2026/08/due-diligence-verified-intelligence.webp',
      width: 1619,
      height: 971,
      alt: 'Investigative analyst verifying corporate relationships, assets, and business records'
    },
    {
      match: 'mpa-4d72f60b',
      src: '/wp-content/uploads/2026/08/due-diligence-tailored-investigation.webp',
      width: 1619,
      height: 971,
      alt: 'Private investigators creating a tailored nationwide due diligence strategy'
    }
  ];

  const replaceImages = () => {
    document.querySelectorAll('body.page-id-475 .post-content img').forEach((image) => {
      const sources = [image.currentSrc, image.src, image.dataset.origSrc].filter(Boolean).join(' ');
      const asset = assets.find(({ match }) => sources.includes(match));

      if (!asset) return;

      image.src = asset.src;
      image.dataset.origSrc = asset.src;
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.removeAttribute('data-orig-srcset');
      image.width = asset.width;
      image.height = asset.height;
      image.alt = asset.alt;
      image.title = asset.alt;
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceImages, { once: true });
  } else {
    replaceImages();
  }
})();
