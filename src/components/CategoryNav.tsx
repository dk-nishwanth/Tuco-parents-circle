import allImg from '../assets/all.png';
import activeKidsImg from '../assets/activekids.png';
import schoolImg from '../assets/school.png';
import skincareImg from '../assets/skincareandhaircare.png';
import parentingImg from '../assets/parenting.png';
import kidsGrowthImg from '../assets/kidsgrowth.png';

interface CategoryNavItem {
  id: string;
  label: string;
  img: string;
  bg: string;
}

// Order + colours follow the design mockup.
const NAV_ITEMS: CategoryNavItem[] = [
  { id: 'all', label: 'all', img: allImg, bg: '#BFEAF7' },
  { id: 'active_kids', label: 'active kids', img: activeKidsImg, bg: '#9FE0B4' },
  { id: 'school', label: 'school & learning', img: schoolImg, bg: '#F6C6A0' },
  { id: 'skincare', label: 'skincare &haircare', img: skincareImg, bg: '#FBE08A' },
  { id: 'parenting_hacks', label: 'parenting hacks', img: parentingImg, bg: '#C9B2E8' },
  { id: 'kids_growth', label: 'kids & growth', img: kidsGrowthImg, bg: '#F2A0A0' },
];

interface CategoryNavProps {
  activeCategory: string;
  onCategoryChange?: (category: string) => void;
}

export function CategoryNav({ activeCategory, onCategoryChange }: CategoryNavProps) {
  return (
    <nav
      aria-label="Categories"
      className="w-full border-b border-neutral-100 bg-white"
    >
      <div className="max-w-7xl mx-auto px-3 md:px-8 py-4 md:py-5">
        <div className="flex gap-5 md:gap-10 justify-start md:justify-center overflow-x-auto md:overflow-visible scrollbar-hide py-3">
          {NAV_ITEMS.map(item => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange?.(item.id)}
                aria-label={item.label}
                aria-pressed={isActive}
                className="group flex flex-col items-center gap-2 shrink-0 w-[72px] md:w-[104px] focus:outline-none"
              >
                <span
                  className={`flex items-center justify-center rounded-full w-[64px] h-[64px] md:w-[92px] md:h-[92px] transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                    isActive
                      ? 'ring-[3px] ring-[#35B5EC] ring-offset-2 ring-offset-white'
                      : 'ring-0'
                  }`}
                  style={{ backgroundColor: item.bg }}
                >
                  <img
                    src={item.img}
                    alt=""
                    aria-hidden="true"
                    className="w-[70%] h-[70%] object-contain"
                    loading="lazy"
                  />
                </span>
                <span
                  className={`font-display font-bold text-[12px] md:text-[13px] leading-[1.15] text-center transition-colors ${
                    isActive ? 'text-[#35B5EC]' : 'text-[#4D4747]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
