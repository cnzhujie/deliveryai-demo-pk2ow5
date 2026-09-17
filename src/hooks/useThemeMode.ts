import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme-mode'

export type ThemeMode = 'light' | 'dark' | 'auto'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getEffectiveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return getSystemDark()
}

function applyDark(isDark: boolean) {
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  } catch {
    // localStorage 不可用时降级为默认 auto
  }
  return 'auto'
}

/**
 * 主题模式管理 hook（三态：light / dark / auto）。
 * 优先级：localStorage > 默认 auto。
 * light / dark 为手动模式，不响应系统偏好变化；
 * auto 模式跟随系统 prefers-color-scheme 实时切换。
 * localStorage 不可用时降级为内存态，不报错不阻塞。
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initial = getInitialMode()
    applyDark(getEffectiveDark(initial))
    return initial
  })

  // 模式变化时重新应用 dark class
  useEffect(() => {
    applyDark(getEffectiveDark(mode))
  }, [mode])

  // auto 模式下监听系统偏好变化
  useEffect(() => {
    if (mode !== 'auto') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyDark(getSystemDark())
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [mode])

  // 循环切换：light → dark → auto → light
  const cycle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage 不可用时降级为内存态，不报错
      }
      return next
    })
  }, [])

  return { mode, cycle }
}
