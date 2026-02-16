'use client';

export default function SiteHeader() {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-3">
                {/* Tiffin Box Icon */}
                <svg className="w-10 h-10 text-d-red" viewBox="0 0 64 64" fill="none" aria-hidden>
                    <rect x="14" y="16" width="36" height="8" rx="2" fill="currentColor" opacity="0.95" />
                    <rect x="16" y="24" width="32" height="10" rx="1.5" fill="currentColor" opacity="0.75" />
                    <rect x="16" y="34" width="32" height="10" rx="1.5" fill="currentColor" opacity="0.55" />
                    <rect x="16" y="44" width="32" height="10" rx="1.5" fill="currentColor" opacity="0.35" />
                    <path d="M28 10 C28 6 36 6 36 10 L36 16 L28 16 Z" fill="currentColor" opacity="0.6" />
                    <rect x="30" y="6" width="4" height="4" rx="2" fill="currentColor" opacity="0.8" />
                </svg>
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-d-black">
                        Dabbathon <span className="text-d-red">v2.0</span>
                    </h1>
                    <p className="text-xs font-medium tracking-widest uppercase text-d-gray-400">BBA PESU</p>
                </div>
            </div>
            <div className="mt-2 h-0.5 w-24 bg-d-red rounded-full" />
        </div>
    );
}
