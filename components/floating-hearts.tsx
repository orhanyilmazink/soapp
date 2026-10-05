import { Heart } from 'lucide-react'

const hearts = [
  { left: '6%', size: 14, delay: '0s', duration: '11s' },
  { left: '18%', size: 20, delay: '3s', duration: '13s' },
  { left: '32%', size: 12, delay: '6s', duration: '10s' },
  { left: '48%', size: 18, delay: '1.5s', duration: '14s' },
  { left: '63%', size: 13, delay: '8s', duration: '12s' },
  { left: '76%', size: 22, delay: '4.5s', duration: '15s' },
  { left: '89%', size: 15, delay: '2s', duration: '11s' },
]

export function FloatingHearts() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute -bottom-8 animate-float-up text-primary/30"
          style={{
            left: h.left,
            width: h.size,
            height: h.size,
            animationDelay: h.delay,
            animationDuration: h.duration,
          }}
        >
          <Heart className="size-full" fill="currentColor" strokeWidth={0} />
        </span>
      ))}
    </div>
  )
}
