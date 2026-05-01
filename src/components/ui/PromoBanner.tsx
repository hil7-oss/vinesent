import Link from 'next/link'
import Image from 'next/image'

interface PromoBannerProps {
  title: string
  subtitle: string
  linkText: string
  linkHref: string
  imageSrc?: string
  bgColor?: string
  textColor?: string
}

export function PromoBanner({ 
  title, 
  subtitle, 
  linkText, 
  linkHref, 
  imageSrc,
  bgColor = 'bg-gray-900',
  textColor,
}: PromoBannerProps) {
  // Detect if imageSrc is valid (not a default SVG fallback that won't render well)
  const hasRealImage = !!imageSrc && !imageSrc.endsWith('.svg') && imageSrc !== ''
  const isLocal = imageSrc?.startsWith('/uploads/') || imageSrc?.startsWith('/api/')
  const isExternal = imageSrc?.startsWith('http')

  // Build bg style if value is inline color
  const isInlineBg = bgColor?.startsWith('#') || bgColor?.startsWith('rgb')
  const bgClass = isInlineBg ? '' : (bgColor || 'bg-gray-900')
  const bgStyle = isInlineBg ? { backgroundColor: bgColor } : {}

  // Text color
  const isInlineText = textColor?.startsWith('#') || textColor?.startsWith('rgb')
  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-brand)',
    ...(isInlineText && textColor ? { color: textColor } : {}),
  }
  const subtitleStyle: React.CSSProperties = isInlineText && textColor ? { color: textColor } : {}
  const subtitleClass = !isInlineText ? (textColor || 'text-white/90') : 'text-white/90'

  return (
    <section className="py-10 lg:py-16 px-4 lg:px-10">
      <Link
        href={linkHref}
        className={`group block relative w-full aspect-[4/3] sm:aspect-[21/9] lg:aspect-[3/1] rounded-2xl overflow-hidden ${bgClass}`}
        style={bgStyle}
      >
        {hasRealImage && (isExternal || isLocal) ? (
          <img
            src={imageSrc}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : hasRealImage ? (
          <Image 
            src={imageSrc!} 
            alt={title} 
            fill 
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
          />
        ) : null}

        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        
        <div className="absolute inset-0 p-6 sm:p-10 lg:p-16 flex flex-col justify-center max-w-[80%] sm:max-w-[60%]">
          <h3 className="text-[20px] sm:text-[32px] lg:text-[48px] font-black uppercase leading-tight mb-2 sm:mb-4 text-white" style={headingStyle}>
            {title}
          </h3>
          <p className={`text-[12px] sm:text-[14px] lg:text-[18px] uppercase tracking-widest mb-6 sm:mb-8 font-medium ${subtitleClass}`} style={subtitleStyle}>
            {subtitle}
          </p>
          <div>
            <span className="inline-flex items-center gap-3 text-[10px] sm:text-[12px] font-bold tracking-[2px] uppercase text-white hover:opacity-70 transition border-b border-white hover:border-transparent pb-1">
              {linkText}
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
