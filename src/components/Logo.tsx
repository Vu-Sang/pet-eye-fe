import React from 'react';
import logo from '../assets/landing/logo.png';
import logo2 from '../assets/landing/logo2.png';

export default function Logo({ className = '', lightText = false, forceWhite = false, dark = false }: { className?: string, lightText?: boolean, forceWhite?: boolean, dark?: boolean }) {
    return (
        <div className={`flex items-center gap group ${className}`}>
            {/* Light mode logo — hidden when dark mode or forced dark */}
            {!(dark || forceWhite) && (
                <>
                    <img
                        src={logo}
                        alt="Peteye Logo Icon"
                        className="w-12 h-12 md:w-[60px] md:h-[60px] object-contain shrink-0 dark:hidden"
                    />
                    <img
                        src={logo2}
                        alt="Peteye Logo Icon"
                        className="w-12 h-12 md:w-[60px] md:h-[60px] object-contain shrink-0 hidden dark:block"
                    />
                </>
            )}
            {/* Always logo2 when dark bg forced (e.g. Footer) */}
            {(dark || forceWhite) && (
                <img
                    src={logo2}
                    alt="Peteye Logo Icon"
                    className="w-12 h-12 md:w-[60px] md:h-[60px] object-contain shrink-0"
                />
            )}
            <span className={`text-lg md:text-[28px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${
                forceWhite
                    ? 'from-white to-white'
                    : dark
                        ? 'from-blue-400 to-secondary'
                        : lightText
                            ? 'from-white to-secondary'
                            : 'from-primary to-blue-500 dark:from-blue-400 dark:to-secondary'
            }`}>
                PetEye
            </span>
        </div>
    );
}
