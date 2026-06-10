import { useEffect, useState } from 'react'

export function useAttendanceTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const sync = () => setTick(t => t + 1)
    window.addEventListener('ap:update', sync)
    const t = setInterval(sync, 5000)
    return () => { window.removeEventListener('ap:update', sync); clearInterval(t) }
  }, [])
}
