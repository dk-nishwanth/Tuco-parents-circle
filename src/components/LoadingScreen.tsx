import tucoLogo from '../assets/tuco-logo.webp';
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF8F4]">
      <div className="loading-logo-wrap flex flex-col items-center gap-5">
        <img src={tucoLogo} alt="tuco Kids" className="loading-logo h-20 w-auto md:h-24" />
        <div className="text-center">
          <h1 className="font-display font-black text-lg md:text-xl text-neutral-800 tracking-tight">
            tuco Parents Circle
          </h1>
          <p className="font-sans text-xs text-neutral-500 font-semibold mt-1">
            Loading your community…
          </p>
        </div>
        <div className="loading-bar-track w-40 h-1 rounded-full bg-neutral-200 overflow-hidden">
          <div className="loading-bar-fill h-full rounded-full bg-tuco-cyan" />
        </div>
      </div>
    </div>
  );
}
