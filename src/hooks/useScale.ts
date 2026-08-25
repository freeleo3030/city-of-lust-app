import { useState, useEffect } from 'react'

export function useScale(baseWidth = 480, min = 0.7, max = 1.3) {
  const [scale, setScale] = useState(() =>
    Math.min(max, Math.max(min, window.innerWidth / baseWidth))
  )
  useEffect(() => {
    const handler = () =>
      setScale(Math.min(max, Math.max(min, window.innerWidth / baseWidth)))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [baseWidth, min, max])
  return scale
}
