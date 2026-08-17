import founderFocusImage from '../assets/founder-focus.jpg';

const INSTAGRAM_URL =
  'https://www.instagram.com/aishvarya_murali?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';

export function FounderFocusSection() {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-[308px] md:w-[420px] mx-auto hover:opacity-90 transition-opacity"
    >
      <img
        src={founderFocusImage}
        alt="Founder Focus — @aishvarya_murali on Instagram"
        className="w-full h-auto block"
      />
    </a>
  );
}
