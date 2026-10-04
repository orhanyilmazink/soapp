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

const letterBurstHearts = [
  { left: '7%', top: '88%', delay: '0ms', size: 12 }, { left: '15%', top: '68%', delay: '110ms', size: 16 },
  { left: '24%', top: '46%', delay: '240ms', size: 11 }, { left: '33%', top: '82%', delay: '70ms', size: 18 },
  { left: '42%', top: '28%', delay: '180ms', size: 13 }, { left: '51%', top: '72%', delay: '310ms', size: 15 },
  { left: '60%', top: '52%', delay: '40ms', size: 10 }, { left: '69%', top: '90%', delay: '220ms', size: 17 },
  { left: '78%', top: '38%', delay: '140ms', size: 12 }, { left: '87%', top: '64%', delay: '290ms', size: 16 },
  { left: '10%', top: '26%', delay: '360ms', size: 10 }, { left: '20%', top: '58%', delay: '420ms', size: 14 },
  { left: '30%', top: '16%', delay: '340ms', size: 12 }, { left: '40%', top: '60%', delay: '480ms', size: 16 },
  { left: '49%', top: '42%', delay: '390ms', size: 11 }, { left: '58%', top: '18%', delay: '520ms', size: 15 },
  { left: '67%', top: '78%', delay: '450ms', size: 12 }, { left: '76%', top: '58%', delay: '580ms', size: 17 },
  { left: '85%', top: '20%', delay: '500ms', size: 11 }, { left: '93%', top: '46%', delay: '620ms', size: 14 },
]

export function FloatingHearts({ letterBurstKey = 0 }: { letterBurstKey?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
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
      {letterBurstKey > 0 && (
        <div key={letterBurstKey} className="fixed inset-0">
          {letterBurstHearts.map((heart, index) => (
            <Heart
              key={index}
              className="letter-burst-heart absolute text-pink-400"
              fill="currentColor"
              strokeWidth={0}
              style={{ left: heart.left, top: heart.top, width: heart.size, height: heart.size, animationDelay: heart.delay }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
