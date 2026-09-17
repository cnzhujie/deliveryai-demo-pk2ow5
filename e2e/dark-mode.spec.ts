import { test, expect, type Page } from '@playwright/test'

/** 全局过渡时长 250ms，断言 computed style 前等待 350ms（transition + 100ms buffer）。 */
const TRANSITION_WAIT = 350

/** Navigate from app start to the menu view (where TopBar with theme toggle is visible). */
async function goToMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

/** 定位主题切换按钮（aria-label 包含「切换主题」）。 */
function themeButton(page: Page) {
  return page.getByRole('button', { name: /切换主题/ })
}

/** 等待 CSS 过渡完成后读取元素的 computed background-color（去掉空格的 rgb/hex）。 */
async function computedBg(page: Page, selector: string): Promise<string> {
  await page.waitForTimeout(TRANSITION_WAIT)
  return page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor)
}

test.describe('夜间模式（Dark Mode）- E2E 验收测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清空 localStorage 确保每次用例从干净状态开始
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('REQ-001.1: TopBar 提供主题切换控件，默认 auto 模式', async ({ page }) => {
    await goToMenu(page)
    const btn = themeButton(page)
    await expect(btn).toBeVisible()
    // 默认 auto 模式，Playwright 默认 system preference 为 light
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')
  })

  test('REQ-001.2: 点击切换按钮循环 Light → Dark → Auto → Light，dark class 同步变化', async ({ page }) => {
    await goToMenu(page)
    // 设置初始为 light
    await page.evaluate(() => localStorage.setItem('theme-mode', 'light'))
    await page.reload()
    // 重新导航到 menu
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    const btn = themeButton(page)

    // Light：无 dark class
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前日间）')
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

    // Light → Dark：有 dark class
    await btn.click()
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前夜间）')
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // Dark → Auto：系统偏好为 light，无 dark class
    await btn.click()
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

    // Auto → Light：无 dark class
    await btn.click()
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前日间）')
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  })

  test('REQ-002: 夜间模式下主背景色从浅色切换为深色', async ({ page }) => {
    await goToMenu(page)
    // 主布局容器 class 包含 bg-rice-100 dark:bg-charcoal-900
    const mainContainer = page.locator('.min-h-screen.bg-rice-100')
    await expect(mainContainer).toBeVisible()

    // 浅色模式背景色 = rice-100 #fbf5ea → rgb(251, 245, 234)
    const lightBg = await computedBg(page, '.min-h-screen.bg-rice-100')

    // 切换到 dark
    await page.evaluate(() => localStorage.setItem('theme-mode', 'dark'))
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    const darkBg = await computedBg(page, '.min-h-screen.bg-rice-100')

    // 深色背景 rgb(33, 31, 28) = charcoal-900 #211f1c，明显不同于浅色
    expect(lightBg).not.toBe(darkBg)
    expect(darkBg).toBe('rgb(33, 31, 28)')
  })

  test('REQ-002: 夜间模式下 TopBar 背景色适配深色', async ({ page }) => {
    await goToMenu(page)

    // 切换到 dark
    await page.evaluate(() => localStorage.setItem('theme-mode', 'dark'))
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // TopBar header class 包含 dark:bg-charcoal-900/95
    const header = page.locator("header.sticky")
    const headerBg = await computedBg(page, "header.sticky")
    await expect(header).toBeVisible()
    
    // charcoal-900 = #211f1c = rgb(33, 31, 28)（/95 opacity 不会改变基础色值的 rgb 提取，因 backdrop-blur 实际取值可能不同，仅验证为深色）
    const rgb = headerBg.match(/\d+/g)?.map(Number) ?? []
    // 深色：各通道值均 < 60
    expect(rgb.length).toBe(3)
    expect(rgb[0]).toBeLessThan(60)
    expect(rgb[1]).toBeLessThan(60)
    expect(rgb[2]).toBeLessThan(60)
  })

  test('REQ-002: 夜间模式下 Button outline variant 颜色适配深色', async ({ page }) => {
    await goToMenu(page)

    // 切换到 dark
    await page.evaluate(() => localStorage.setItem('theme-mode', 'dark'))
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // 主题切换按钮是 outline variant，dark 下 bg-charcoal-700 = #34312d = rgb(52, 49, 45)
    const btn = themeButton(page)
    // 验证 outline 按钮存在且可见（通过 aria-label 定位）
    await expect(btn).toBeVisible()
    const btnComputedBg = await page.evaluate(() => {
      const el = document.querySelector<HTMLButtonElement>('[aria-label="切换主题（当前夜间）"]')
      return el ? getComputedStyle(el).backgroundColor : ''
    })
    expect(btnComputedBg).toBe('rgb(52, 49, 45)')
  })

  test('REQ-003.1: Auto 模式下系统偏好为 dark 时自动应用夜间主题', async ({ page }) => {
    // 模拟系统深色偏好
    await page.emulateMedia({ colorScheme: 'dark' })
    await goToMenu(page)

    // 默认 auto 模式，系统为 dark → html 有 dark class
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    const btn = themeButton(page)
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')
  })

  test('REQ-003.2: Auto 模式下系统偏好为 light 时应用日间主题', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await goToMenu(page)

    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    const btn = themeButton(page)
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')
  })

  test('REQ-003.3: Auto 模式下系统偏好变化时实时更新主题', async ({ page }) => {
    // 先设为 light 系统偏好
    await page.emulateMedia({ colorScheme: 'light' })
    await goToMenu(page)
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

    // 确保 auto 模式
    await expect(themeButton(page)).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')

    // 切换系统偏好到 dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // 切换回 light
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  })

  test('REQ-003.4: 手动选择 Light/Dark 时不响应系统偏好变化', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await goToMenu(page)

    // 手动切到 dark
    await themeButton(page).click() // auto → light → wait, cycle is light→dark→auto→light
    // Default is auto. First click: auto → light
    await expect(themeButton(page)).toHaveAttribute('aria-label', '切换主题（当前日间）')
    // Second click: light → dark
    await themeButton(page).click()
    await expect(themeButton(page)).toHaveAttribute('aria-label', '切换主题（当前夜间）')
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // 系统偏好切换为 light，但手动 dark 不跟随
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // 系统偏好切回 dark，仍保持手动 dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  })

  test('REQ-004.1: 用户选择的主题模式持久化到 localStorage', async ({ page }) => {
    await goToMenu(page)
    const btn = themeButton(page)

    // auto → light → dark
    await btn.click() // auto → light
    await btn.click() // light → dark

    // 验证 localStorage 存储了 dark
    const stored = await page.evaluate(() => localStorage.getItem('theme-mode'))
    expect(stored).toBe('dark')
  })

  test('REQ-004.2: 重新加载页面后从 localStorage 恢复主题模式', async ({ page }) => {
    await goToMenu(page)
    // 切换到 dark 并持久化
    await page.evaluate(() => localStorage.setItem('theme-mode', 'dark'))
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(themeButton(page)).toHaveAttribute('aria-label', '切换主题（当前夜间）')
  })

  test('REQ-004.3: 首次访问（无 localStorage）默认 auto 模式，跟随系统浅色偏好', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await goToMenu(page)

    await expect(themeButton(page)).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

    const stored = await page.evaluate(() => localStorage.getItem('theme-mode'))
    // 首次访问未写入 localStorage，useThemeMode getInitialMode 返回默认 'auto' 但不写入
    // 验证行为而非实现：主题为 auto
    expect(stored).toBeNull()
  })

  test('REQ-004.4 / NFR-005: index.html 内联脚本在 React 挂载前设置 dark class（无 FOUC）', async ({ page }) => {
    // 设置 localStorage 为 dark
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('theme-mode', 'dark'))

    // 重新导航并在 DOMContentLoaded 后立即检查 html class（不等 React 挂载）
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // 在此时刻 React 尚未挂载（#root 为空），但内联脚本应已添加 dark class
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    // 验证 React 尚未挂载
    const rootHtml = await page.locator('#root').innerHTML()
    expect(rootHtml).toBe('')
  })

  test('NFR-003: 夜间模式与老人模式同时启用，两者叠加生效', async ({ page }) => {
    await goToMenu(page)

    // 切换到 dark
    await themeButton(page).click() // auto → light
    await themeButton(page).click() // light → dark
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    // 开启老人模式
    const elderlyBtn = page.getByRole('button', { name: /老人模式/ })
    await elderlyBtn.click()

    // 验证 dark class 和 elderly class 同时存在
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(page.locator('html')).toHaveClass(/\belderly\b/)

    // 老人模式下 html font-size 应放大
    const fontSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
    expect(parseFloat(fontSize)).toBeGreaterThan(16)

    // 关闭老人模式后 dark class 保持
    await elderlyBtn.click()
    await expect(page.locator('html')).not.toHaveClass(/\belderly\b/)
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  })

  test('NFR-004: localStorage 不可用时主题切换在当前会话内正常工作', async ({ page }) => {
    await goToMenu(page)

    // 模拟 localStorage 不可用：覆盖 setItem 抛异常
    await page.evaluate(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => null,
          setItem: () => { throw new Error('blocked') },
          removeItem: () => {},
        },
        writable: false,
      })
    })

    // 触发重新初始化：重新加载后 localStorage 不可用
    // 由于 localStorage 已被覆盖，reload 后会重新初始化
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    const btn = themeButton(page)
    // 默认 auto（localStorage 不可用，降级为 auto）
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前跟随系统）')

    // 切换到 dark：应正常工作
    await btn.click() // auto → light
    await btn.click() // light → dark
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(btn).toHaveAttribute('aria-label', '切换主题（当前夜间）')
  })
})
