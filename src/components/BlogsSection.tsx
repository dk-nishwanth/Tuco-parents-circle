interface BlogItem {
  title: string;
  author: string;
  date: string;
  href: string;
  image?: string;
}

const BLOGS: BlogItem[] = [
  {
    title: 'Hair Loss in Children Due to Vitamin Deficiency: Causes, Diagnosis & Home Remedies',
    author: 'tuco kids',
    date: '31 July 2026',
    href: 'https://tucokids.com/blogs/health/hair-loss-in-children-due-to-vitamin-deficiency-causes-diagnosis-home-remedies',
    image: 'https://tucokids.com/cdn/shop/articles/SEO_Blog_Banners_New-25.webp?v=1785496702',
  },
  {
    title: 'Why Is My Child Losing So Much Hair? Causes Every Indian Parent Should Know',
    author: 'Srividhya Suresh',
    date: '15 May 2026',
    href: 'https://tucokids.com/blogs/health/why-is-my-child-losing-so-much-hair-causes-every-indian-parent-should-know',
    image: 'https://tucokids.com/cdn/shop/articles/SEO_6_b361dcb6-4bb3-4cae-a6c1-3434c4198b50.webp?v=1780653739',
  },
  {
    title: 'Baby Rashes on Face: Causes & Home Remedies',
    author: 'tuco kids',
    date: '11 August 2026',
    href: 'https://tucokids.com/blogs/skincare/baby-rashes-on-face-causes-home-remedies',
    image: 'https://tucokids.com/cdn/shop/articles/37_22b0b924-52db-43ed-80cb-7f9902dbace2.png?v=1786458983',
  },
];

const READ_MORE_URL = 'https://tucokids.com/pages/health-1';

export function BlogsSection() {
  return (
    <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm px-4 md:px-6 pt-5 pb-6 md:pt-6 md:pb-7">
      <div className="flex flex-col">
        {BLOGS.map((blog, i) => (
          <a
            key={i}
            href={blog.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start justify-between gap-4 py-4 md:py-5 hover:opacity-80 transition-opacity ${
              i > 0 ? 'border-t border-neutral-200' : ''
            }`}
          >
            <div className="flex flex-col justify-between min-w-0">
              <h3 className="font-display font-medium text-neutral-800 text-[16px] leading-[16px] tracking-[-0.05em] md:text-[24px] md:leading-[20px]">
                {blog.title}
              </h3>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-7 h-7 rounded-full bg-tuco-cyan/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-700" fill="currentColor">
                    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.8-3.6-5-8-5Z" />
                  </svg>
                </div>
                <span className="text-sm md:text-base text-neutral-700 truncate">{blog.author}</span>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between flex-shrink-0">
              {blog.image ? (
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-32 h-20 md:w-52 md:h-28 rounded-xl object-cover bg-neutral-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-32 h-20 md:w-52 md:h-28 rounded-xl bg-neutral-200" />
              )}
              <span className="text-sm md:text-base text-neutral-600 mt-4 whitespace-nowrap">{blog.date}</span>
            </div>
          </a>
        ))}
      </div>
      <div className="flex justify-center mt-2 md:mt-3">
        <a
          href={READ_MORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 rounded-full bg-tuco-cyan text-white font-display font-bold hover:brightness-95 transition-all"
        >
          read more
        </a>
      </div>
    </div>
  );
}
