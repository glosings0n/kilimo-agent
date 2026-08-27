export function DrcFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="drc-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#drc-clip)">
        {/* Sky Blue Field */}
        <rect width="60" height="36" fill="#0077D4"/>
        {/* Yellow Diagonal Stripe Border */}
        <line x1="0" y1="36" x2="60" y2="0" stroke="#FCD116" strokeWidth="12"/>
        {/* Red Central Diagonal Stripe */}
        <line x1="0" y1="36" x2="60" y2="0" stroke="#CE1126" strokeWidth="6"/>
        {/* Yellow Star in Top Left */}
        <path d="M10 4L11.5 8.5H16.2L12.4 11.2L13.8 15.7L10 13L6.2 15.7L7.6 11.2L3.8 8.5H8.5L10 4Z" fill="#FCD116"/>
      </g>
    </svg>
  );
}

export function KenyaFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="ke-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#ke-clip)">
        {/* Black Top Band */}
        <rect width="60" height="11" fill="#000000"/>
        {/* White Top Border */}
        <rect y="11" width="60" height="2" fill="#FFFFFF"/>
        {/* Red Middle Band */}
        <rect y="13" width="60" height="10" fill="#BB0000"/>
        {/* White Bottom Border */}
        <rect y="23" width="60" height="2" fill="#FFFFFF"/>
        {/* Green Bottom Band */}
        <rect y="25" width="60" height="11" fill="#006600"/>
        {/* Maasai Shield Center */}
        <ellipse cx="30" cy="18" rx="5" ry="9" fill="#BB0000" stroke="#FFFFFF" strokeWidth="1"/>
        <line x1="30" y1="6" x2="30" y2="30" stroke="#000000" strokeWidth="1.5"/>
        <ellipse cx="30" cy="18" rx="2.5" ry="4" fill="#000000"/>
      </g>
    </svg>
  );
}

export function RwandaFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="rw-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#rw-clip)">
        {/* Blue Top Half */}
        <rect width="60" height="18" fill="#00A1DE"/>
        {/* Yellow Golden Sun in Top Right */}
        <circle cx="50" cy="9" r="4.5" fill="#E5A93C"/>
        {/* Yellow Middle Quarter */}
        <rect y="18" width="60" height="9" fill="#FAD201"/>
        {/* Green Bottom Quarter */}
        <rect y="27" width="60" height="9" fill="#20603D"/>
      </g>
    </svg>
  );
}

export function TanzaniaFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="tz-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#tz-clip)">
        {/* Top-left Green field */}
        <rect width="60" height="36" fill="#1EB53A"/>
        {/* Bottom-right Blue triangle */}
        <polygon points="0,36 60,0 60,36" fill="#00A3DD"/>
        {/* Yellow diagonal borders */}
        <line x1="0" y1="36" x2="60" y2="0" stroke="#FCD116" strokeWidth="12"/>
        {/* Black central diagonal stripe */}
        <line x1="0" y1="36" x2="60" y2="0" stroke="#000000" strokeWidth="7"/>
      </g>
    </svg>
  );
}

export function UgandaFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="ug-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#ug-clip)">
        <rect y="0" width="60" height="6" fill="#000000"/>
        <rect y="6" width="60" height="6" fill="#FCD116"/>
        <rect y="12" width="60" height="6" fill="#D90000"/>
        <rect y="18" width="60" height="6" fill="#000000"/>
        <rect y="24" width="60" height="6" fill="#FCD116"/>
        <rect y="30" width="60" height="6" fill="#D90000"/>
        <circle cx="30" cy="18" r="5" fill="#FFFFFF"/>
        <circle cx="30" cy="18" r="2.5" fill="#555555"/>
      </g>
    </svg>
  );
}

export function UkFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="uk-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#uk-clip)">
        <rect width="60" height="36" fill="#012169"/>
        <path d="M0 0L60 36M60 0L0 36" stroke="#FFFFFF" strokeWidth="6"/>
        <path d="M0 0L60 36M60 0L0 36" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30 0V36M0 18H60" stroke="#FFFFFF" strokeWidth="10"/>
        <path d="M30 0V36M0 18H60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
}

export function FranceFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg className={`${className} rounded-xs shrink-0 shadow-xs inline-block`} viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="fr-clip"><rect width="60" height="36" rx="3"/></clipPath>
      <g clipPath="url(#fr-clip)">
        <rect width="20" height="36" fill="#002654"/>
        <rect x="20" width="20" height="36" fill="#FFFFFF"/>
        <rect x="40" width="20" height="36" fill="#CE1126"/>
      </g>
    </svg>
  );
}

/**
 * Universal CountryFlag component: returns crisp SVG flag for any regional country code or name.
 */
export function CountryFlag({ country, className = "w-5 h-3.5" }) {
  const norm = (country || "").toLowerCase().trim();
  if (norm.includes("drc") || norm.includes("rdc") || norm.includes("congo")) {
    return <DrcFlag className={className} />;
  }
  if (norm.includes("kenya") || norm.includes("ke")) {
    return <KenyaFlag className={className} />;
  }
  if (norm.includes("rwanda") || norm.includes("rw")) {
    return <RwandaFlag className={className} />;
  }
  if (norm.includes("tanzania") || norm.includes("tz")) {
    return <TanzaniaFlag className={className} />;
  }
  if (norm.includes("uganda") || norm.includes("ug")) {
    return <UgandaFlag className={className} />;
  }
  if (norm.includes("france") || norm.includes("fr")) {
    return <FranceFlag className={className} />;
  }
  if (norm.includes("uk") || norm.includes("en") || norm.includes("united kingdom")) {
    return <UkFlag className={className} />;
  }
  return <DrcFlag className={className} />;
}
