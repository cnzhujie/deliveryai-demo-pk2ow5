---
spec_id: dark-mode-spec-001
title: 夜间模式（Dark Mode）
status: confirmed
schema_version: 1
product_area: 全局 UI / 主题切换
baseline_spec: 无（基于初始提交 a2cb35d 的线上浅色主题）
depends_on_specs: []
supersedes_specs: []
source_documents:
  - AGENTS.md（仓库约定）
  - src/index.css（全局样式与过渡）
  - src/hooks/useElderlyMode.ts（localStorage + html class 模式参考）
  - src/components/TopBar.tsx（现有主题切换入口）
  - tailwind.config.js（色板定义）
created_at: 2026-09-17
updated_at: 2026-09-17
---

# Spec: 夜间模式（Dark Mode）

# 0. 文档元信息

## 0.1 基本信息

- **文档类型**: ☑ 新增需求
- **适用产品范围**: 沸点火锅点单演示应用（`hdl-order-demo`）全局 UI，所有视图页面与通用组件
- **版本基线说明**: 基于 `main` 分支初始提交 `a2cb35d`，当前为单一浅色主题，Tailwind 未配置 `darkMode`，无 CSS 变量层

## 0.2 证据来源

| 来源 | 用途 | 可信度 | 备注 |
|------|------|--------|------|
| 任务描述「添加夜间模式」 | 需求原始输入 | 高 | 明确列出 3 个功能目标 |
| `AGENTS.md` | 技术约定与约束 | 高 | 明确「不引入 CSS 变量抽象层」「仅需浅色样式」——本需求需更新此约定 |
| `tailwind.config.js` | 现有色板定义 | 高 | rice/charcoal/chili/amber 四色系 |
| `src/index.css` | 全局过渡与基础样式 | 高 | 已有 250ms 颜色过渡 |
| `src/hooks/useElderlyMode.ts` | Hook 模式参考 | 高 | localStorage + html classToggle，try/catch 降级 |
| `src/components/TopBar.tsx` | 现有切换入口布局 | 高 | 已有语言、老人模式切换按钮 |

---

# 1. 需求背景

- **需求类型**: ☑ 用户反馈 ☐ 数据洞察 ☑ 竞品驱动
- **背景 / 驱动**: 在低光环境（晚间、室内灯光较暗）下，当前浅色主题背景亮度高、对比度强，长时间使用对眼睛刺激较大。现代应用普遍提供夜间模式以降低视觉负担。
- **用户价值**: 为在低光环境下使用点单演示的用户提供更舒适的视觉体验，降低屏幕亮度与对比度对眼睛的刺激。
- **关联重点特性**: 与现有「老人模式」（放大字号 + 增强对比度）功能正交，两者可同时启用。

| 用户角色 | 核心场景 | 痛点 | 相关 SA |
|----------|----------|------|---------|
| 演示体验者 | 在低光环境下浏览和操作点单流程 | 浅色主题刺眼，视觉不适 | 无 |

---

# 2. 目标与边界

## 2.1 目标

| 目标 ID | 类目 | 目标描述 | 可度量指标 | 目标值 |
|---------|------|----------|------------|--------|
| GOAL-001 | 用户体验 | 支持手动切换日间/夜间主题 | 手动切换后全站主题即时变化 | 切换后背景/文字/控件颜色符合夜间配色 |
| GOAL-002 | 用户体验 | 支持跟随系统深色模式偏好自动切换 | 系统切换深色模式后应用自动跟随 | 自动模式下系统切换后 1s 内主题更新 |
| GOAL-003 | 用户体验 | 主题切换平滑过渡，无明显闪烁 | 切换时颜色过渡时长 | 复用现有 250ms 全局过渡，无突兀跳变 |
| GOAL-004 | 技术质量 | 夜间模式下所有页面与控件颜色适配 | 遍历所有视图页面 | 无残留浅色背景、不可读文字或对比度不足区域 |

## 2.2 非目标

| 非目标 ID | 不做的内容 | 原因 / 后续规划 |
|-----------|------------|------------------|
| NG-001 | 不修改图片资源（hotpot.jpg 等菜品图片） | 图片内容与主题无关，仅调整 CSS 颜色层 |
| NG-002 | 不引入额外 UI 库或设计系统框架 | 遵循 AGENTS.md「不引入额外 UI 库」约定 |
| NG-003 | 不修改 `server/` 目录 | 服务端仅为健康检查，无业务逻辑 |
| NG-004 | 不引入后端 API 调用 | 所有偏好存储在前端 localStorage |
| NG-005 | 不做主题色自定义/多主题选择 | 本需求仅支持日间/夜间双主题 |
| NG-006 | 不改变老人模式功能逻辑 | 夜间模式与老人模式正交，互不干扰 |

---

# 3. 核心概念

| 概念 / 术语 | 描述 | 备注 |
|-------------|------|------|
| 日间模式（Light Mode） | 当前默认浅色主题，暖白/米色背景 + 深色文字 | 现有线上的唯一主题 |
| 夜间模式（Dark Mode） | 新增深色主题，深色背景 + 浅色文字 | 本需求交付物 |
| 系统偏好（System Preference） | 操作系统级别的深色模式设置，通过 `prefers-color-scheme` 媒体查询检测 | 浏览器原生 API |
| 主题模式（Theme Mode） | 三态枚举：`light`（日间）/ `dark`（夜间）/ `auto`（跟随系统） | 用户可选手动模式 |
| 生效主题（Effective Theme） | `auto` 模式下根据系统偏好解析出的实际主题（light 或 dark） | 非 `auto` 模式下等于用户选择 |

---

# 4. 页面与信息架构

## 4.1 入口路径

| 入口 ID | 入口位置 | 目标页面 | 权限 / 前置条件 | 备注 |
|---------|----------|----------|------------------|------|
| ENTRY-001 | TopBar 顶部导航栏 | 主题切换（内联控件） | 无 | 与语言、老人模式切换按钮同区域 |

## 4.2 页面清单

本次不新增页面，所有现有页面均需适配夜间配色：

| 页面 ID | 页面名称 | 页面用途 | 主要操作 | 关联 REQ |
|---------|----------|----------|----------|----------|
| PAGE-001 | 绑定餐桌（BindTable） | 扫码绑定桌台 | 选择桌台 | REQ-002 |
| PAGE-002 | 欢迎页（WelcomeView） | 欢迎页引导 | 进入点餐 | REQ-002 |
| PAGE-003 | 菜单点餐（MenuView） | 浏览/选择菜品、规格弹窗 | 点餐、选择规格 | REQ-002 |
| PAGE-004 | 购物车（CartPanel） | 购物车面板 | 数量调整、提交 | REQ-002 |
| PAGE-005 | 订单履约（OrderView） | 订单进度与菜品状态 | 查看、退菜、结账 | REQ-002 |
| PAGE-006 | 结账支付（CheckoutView） | 账单确认与模拟支付 | 选择支付、确认 | REQ-002 |
| PAGE-007 | 桌边服务（ServiceSheet） | 呼叫桌边服务 | 选择服务类型 | REQ-002 |
| PAGE-008 | 演示控制台（DemoConsole） | 演示状态切换 | 切换履约/售罄/响应 | REQ-002 |
| PAGE-009 | 顶部导航（TopBar） | 导航与全局切换 | 切换主题/语言/老人模式 | REQ-001, REQ-002 |

## 4.3 页面关系

本次无新增页面跳转关系。主题切换为全局行为，切换后所有当前可见页面即时更新配色。

---

# 5. 功能需求

## REQ-001: 手动切换日间/夜间主题

**User Story**
> As a 演示体验者, I want 手动切换日间/夜间主题, so that 在不同光线环境下选择最舒适的视觉模式。

**Priority**: P0

**需求描述**
用户可在 TopBar 区域通过主题切换控件手动切换主题模式。主题模式为三态：日间（Light）、夜间（Dark）、跟随系统（Auto）。切换后全站立即应用对应主题，并通过 250ms 平滑过渡完成颜色变化。用户选择持久化到 localStorage，下次访问自动恢复。

**Acceptance Requirements**
- **REQ-001.1**: The system **shall** 在 TopBar 提供一个主题切换控件，可循环切换三种模式：Light → Dark → Auto → Light（已确认）。
- **REQ-001.2**: **When** 用户点击主题切换控件, the system **shall** 立即切换到下一个模式，全站颜色在 250ms 内平滑过渡到新主题。
- **REQ-001.3**: **When** 用户手动选择 Light 或 Dark, the system **shall** 将该选择持久化到 localStorage，并不再跟随系统偏好变化。
- **REQ-001.4**: **When** 用户选择 Auto, the system **shall** 立即根据当前系统偏好（`prefers-color-scheme`）解析并应用对应主题。
- **REQ-001.5**: **If** localStorage 不可用, the system **shall** 降级为内存态，不报错不阻塞，当前会话内主题切换仍然有效。
- **REQ-001.6**: The system **shall** 在 React 挂载前（`index.html` 内联脚本中）根据 localStorage 或系统偏好初始化主题 class，避免首屏闪烁（FOUC）。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 点击 TopBar 主题切换按钮 | 当前模式切换到下一个（Light→Dark→Auto→Light） |
| 2 | 等待 ~250ms | 全站颜色平滑过渡到新主题 |
| 3 | 继续操作 | 页面功能不受影响，主题保持当前状态 |

**关联埋点**: 无
**实现映射**: Design §8（技术约束）, Tasks T-001

---

## REQ-002: 全站夜间配色适配

**User Story**
> As a 演示体验者, I want 夜间模式下所有页面和控件颜色适配深色背景, so that 不会有刺眼的浅色残留或不可读的文字。

**Priority**: P0

**需求描述**
夜间模式下，所有现有页面（绑定餐桌、欢迎页、菜单、购物车、订单、结账、服务、控制台、TopBar）和通用组件（Button、Dialog）的颜色应适配深色背景。包括但不限于：背景色、文字色、边框色、卡片色、按钮各 variant、遮罩色、阴影色、图标色等。夜间配色应保持品牌识别度（暖色调），同时确保文字与背景对比度满足可读性要求。

**Acceptance Requirements**
- **REQ-002.1**: The system **shall** 在夜间模式下将全局背景从暖白色（rice-100 `#fbf5ea`）切换为深色背景。
- **REQ-002.2**: The system **shall** 在夜间模式下将主文字色从深灰（charcoal-900 `#211f1c`）切换为浅色文字，确保对比度 ≥ 4.5:1。
- **REQ-002.3**: The system **shall** 在夜间模式下适配所有 Button variant（default/secondary/outline/ghost）的背景、文字和边框颜色。
- **REQ-002.4**: The system **shall** 在夜间模式下适配 Dialog 组件的遮罩色和内容区背景。
- **REQ-002.5**: The system **shall** 在夜间模式下适配所有页面级组件中硬编码的颜色类名（如 `bg-rice-100`、`bg-white`、`text-charcoal-900`、`border-charcoal-900/5` 等）。
- **REQ-002.6**: **If** 夜间模式与老人模式同时启用, the system **shall** 两者叠加生效（夜间深色背景 + 老人模式放大字号/增强对比度），不互相冲突。
- **REQ-002.7**: The system **shall** 在夜间模式下保持品牌色（chili 红、amber 黄）的可识别性，必要时调整明度以适配深色背景。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 切换到夜间模式 | 全站背景变为深色，文字变为浅色 |
| 2 | 浏览各页面 | 所有页面、弹窗、按钮颜色适配深色背景 |
| 3 | 操作菜单、购物车、下单等功能 | 功能正常，颜色一致性保持 |

**关联埋点**: 无
**实现映射**: Design §8, Tasks T-002

---

## REQ-003: 跟随系统深色模式偏好自动切换

**User Story**
> As a 演示体验者, I want 应用自动跟随系统的深色模式设置, so that 不需要每次手动切换。

**Priority**: P1

**需求描述**
当用户选择 Auto 模式时，应用通过 `prefers-color-scheme` 媒体查询检测系统深色模式偏好，并自动应用对应主题。当系统偏好发生变化时（如系统从日间切换到夜间），应用应实时响应并更新主题。

**Acceptance Requirements**
- **REQ-003.1**: **When** 主题模式为 Auto 且系统偏好为 dark, the system **shall** 自动应用夜间主题。
- **REQ-003.2**: **When** 主题模式为 Auto 且系统偏好为 light, the system **shall** 自动应用日间主题。
- **REQ-003.3**: **When** 系统偏好发生变化（light↔dark）且当前模式为 Auto, the system **shall** 在系统变化后实时更新应用主题。
- **REQ-003.4**: **When** 用户手动选择 Light 或 Dark（非 Auto）, the system **shall not** 响应系统偏好变化，保持用户手动选择的主题。
- **REQ-003.5**: **If** 系统未设置 `prefers-color-scheme` 或不支持该查询, the system **shall** 默认使用日间主题。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 选择 Auto 模式 | 应用根据当前系统偏好自动选择日间或夜间 |
| 2 | 切换系统深色模式设置 | 应用实时跟随系统主题变化 |
| 3 | 手动切换回 Light 或 Dark | 停止跟随系统，使用手动选择 |

**关联埋点**: 无
**实现映射**: Design §8, Tasks T-003

---

## REQ-004: 主题偏好持久化与恢复

**User Story**
> As a 演示体验者, I want 我的主题偏好在下次访问时自动恢复, so that 不需要每次重新设置。

**Priority**: P1

**需求描述**
用户的主题模式选择（Light/Dark/Auto）持久化到 localStorage，下次访问时自动读取并恢复。在 React 挂载前通过 `index.html` 内联脚本提前设置主题 class，避免首屏主题闪烁。

**Acceptance Requirements**
- **REQ-004.1**: The system **shall** 将用户选择的主题模式（`light`/`dark`/`auto`）存储到 localStorage。
- **REQ-004.2**: **When** 用户下次访问应用, the system **shall** 从 localStorage 读取上次选择的主题模式并恢复。
- **REQ-004.3**: **When** 首次访问（无 localStorage 记录）, the system **shall** 使用默认主题模式 `auto`（已确认），跟随系统偏好；若系统为浅色则默认日间。
- **REQ-004.4**: The system **shall** 在 `index.html` 的内联脚本中初始化主题 class，确保在 React 挂载前 html 已具备正确主题 class，避免 FOUC。
- **REQ-004.5**: **If** localStorage 不可用, the system **shall** 降级为内存态，当前会话内主题切换仍有效，下次访问不恢复。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 选择主题模式 | 模式存储到 localStorage |
| 2 | 关闭并重新打开页面 | 自动恢复上次选择的主题模式 |

**关联埋点**: 无
**实现映射**: Design §8, Tasks T-004

---

# 6. 字段与校验

| 字段 ID | 字段名称 | 类型 | 必填 | 默认值 | 约束 / 校验 | 使用页面 / 展示位置 | 关联 REQ |
|---------|----------|------|------|--------|-------------|----------------------|----------|
| FIELD-001 | theme-mode | enum | 是 | `auto`（推断） | 枚举值：`light` / `dark` / `auto`；localStorage key: `theme-mode` | localStorage 持久化字段 | REQ-001, REQ-004 |
| FIELD-002 | html.dark class | boolean | 是 | 无（由 theme-mode 解析） | 存在 = 夜间模式生效；不存在 = 日间模式 | `document.documentElement.classList` | REQ-001, REQ-002, REQ-004 |

---

# 7. 状态与流转

## 7.1 状态定义

| 状态 ID | 状态名称 | 含义 | 进入条件 | 退出条件 |
|---------|----------|------|----------|----------|
| STATE-001 | Light | 日间模式生效 | 用户选择 Light，或 Auto 模式下系统为 light | 用户切换到 Dark/Auto，或 Auto 下系统切换为 dark |
| STATE-002 | Dark | 夜间模式生效 | 用户选择 Dark，或 Auto 模式下系统为 dark | 用户切换到 Light/Auto，或 Auto 下系统切换为 light |
| STATE-003 | Auto | 跟随系统模式（不直接对应视觉状态，由系统偏好解析为 Light/Dark） | 用户选择 Auto | 用户手动选择 Light 或 Dark |

## 7.2 操作流转

| 操作 ID | 用户动作 | 前置状态 | 目标状态 | 生效时机 | 失败处理 | 关联 REQ |
|---------|----------|----------|----------|----------|----------|----------|
| ACTION-001 | 点击主题切换按钮 | Light | Dark | 立即 | localStorage 写入失败时降级内存态 | REQ-001 |
| ACTION-002 | 点击主题切换按钮 | Dark | Auto | 立即 | localStorage 写入失败时降级内存态 | REQ-001 |
| ACTION-003 | 点击主题切换按钮 | Auto | Light | 立即 | localStorage 写入失败时降级内存态 | REQ-001 |
| ACTION-004 | 系统偏好变化（Auto 模式下） | Light↔Dark | 解析后对应主题 | 实时（媒体查询事件） | 不支持媒体查询时保持当前状态 | REQ-003 |
| ACTION-005 | 页面加载 | 无 | 恢复上次选择或默认 | React 挂载前（index.html 脚本） | localStorage 不可用时使用内存态默认 | REQ-004 |

## 7.3 状态与反馈

- **成功**: 切换主题后，全站颜色在 250ms 内平滑过渡到新主题；TopBar 切换按钮图标/状态反映当前模式。
- **失败**: localStorage 写入失败时静默降级为内存态，当前会话内主题切换仍有效，无错误提示。
- **空态**: 首次访问无 localStorage 记录时，使用默认主题模式（`推断：auto`）。
- **无权限**: 无权限要求，所有用户均可切换主题。
- **异常**: 浏览器不支持 `prefers-color-scheme` 时，Auto 模式默认使用日间主题，不报错。
- **保持不变**: 老人模式功能、语言切换、所有业务流程（点餐、下单、服务呼叫、结账等）不受主题切换影响。

---

# 8. API 设计

本次无 API 变更。所有主题逻辑在前端完成，不涉及后端接口。

---

# 9. 非功能性需求

| NFR ID | 类别 | 要求 | 验收方法 |
|--------|------|------|----------|
| NFR-001 | 性能 | 主题切换不引入明显延迟，颜色过渡利用现有 250ms 全局 CSS transition，不额外增加 JS 动画 | 手动切换主题，观察过渡是否平滑、无卡顿 |
| NFR-002 | 可用性 | 夜间模式下文字与背景对比度 ≥ 4.5:1（WCAG AA） | 检查夜间模式各页面的文字/背景对比度 |
| NFR-003 | 兼容 | 夜间模式与老人模式可同时启用，不互相冲突 | 同时开启夜间模式 + 老人模式，验证视觉叠加效果 |
| NFR-004 | 稳定性 | localStorage 不可用时降级为内存态，不报错不阻塞 | 在隐私模式下测试主题切换功能 |
| NFR-005 | 体验 | 首屏无主题闪烁（FOUC），React 挂载前已设置正确主题 class | 刷新页面观察首屏是否有白屏→深色闪烁 |
| NFR-006 | 兼容 | 不引入额外 UI 库、CSS 框架或设计系统依赖 | 检查 `package.json` 无新增依赖 |
| NFR-007 | 可维护 | 夜间配色方案应集中管理，便于后续维护和调整 | 代码审查：暗色颜色值通过 Tailwind dark: 变体统一管理，不引入额外抽象层 |

---

# 10. 约束限制

- **实现边界**: 遵循 AGENTS.md 既有约定，不引入额外 UI 库或设计系统框架；不使用 CSS Modules 或 styled-components；不修改 `server/` 目录；不引入后端 API 调用。
- **AGENTS.md 约定更新**: 当前 AGENTS.md 记载「不引入 CSS 变量抽象层」「仅需浅色样式」「Tailwind 未配置 darkMode」。本需求需要更新这些约定以支持暗色模式。实现方式上，需在 Tailwind 配置中启用 `darkMode: 'class'`，并为现有颜色类名补充 `dark:` 变体（推断：采用 Tailwind `dark:` 变体方式，与现有「Tailwind 类名直写模式」一致）。
- **保持不变**: 老人模式功能逻辑、语言切换、所有业务流程（绑定桌台、点餐、购物车、下单、服务呼叫、结账支付）不受主题切换影响。
- **localStorage 约定**: 新增 localStorage key `theme-mode`，遵循现有 try/catch 降级模式（参考 `useElderlyMode.ts`）。
- **初始化脚本**: 在 `index.html` 的内联 `<script>` 中扩展主题初始化逻辑（参考现有 i18n lang 设置逻辑），确保 React 挂载前 html 已具备 `dark` class。
- **Hook 模式**: 新增 `useThemeMode` hook，参照 `useElderlyMode.ts` 模式（useState + localStorage + html classToggle + try/catch 降级）。
- **i18n**: 主题切换相关的 aria-label 等文案需在 `src/i18n.ts` 的 `zh.translation` 和 `en.translation` 同步添加。
- **E2E 测试**: 现有 E2E 用例使用 Tailwind 业务 class 断言（如 `border-chili-500`），需评估暗色模式下这些断言是否受影响；可能需要为夜间模式新增 E2E 用例。

---

# 11. 验收标准

- [主流程] 在应用任意页面下，用户点击 TopBar 主题切换按钮后，全站颜色应在 250ms 内平滑过渡到新主题（日间↔夜间），切换按钮反映当前模式。
- [主流程] 在主题模式为 Auto 下，系统切换深色模式设置后，应用应自动跟随切换到夜间主题；系统切换回浅色后，应用自动回到日间主题。
- [内容正确性] 夜间模式下，所有页面（绑定餐桌、欢迎页、菜单、购物车、订单、结账、服务、控制台）和通用组件（Button、Dialog）的背景、文字、边框、按钮颜色应适配深色背景，无残留浅色背景区域。
- [对比度] 夜间模式下，所有正文文字与背景对比度 ≥ 4.5:1（WCAG AA）。
- [边界约束] 本次改动不应影响老人模式功能——同时启用夜间模式 + 老人模式时，两者叠加生效，字号放大和深色背景同时呈现。
- [边界约束] 本次改动不应影响语言切换、点餐、下单、服务呼叫、结账等业务功能。
- [持久化] 用户选择主题模式后关闭并重新打开页面，应自动恢复上次选择的主题模式；首次访问无记录时使用默认模式。
- [异常处理] 在 localStorage 不可用（如隐私模式）时，主题切换功能应在当前会话内正常工作，不报错不阻塞。
- [兼容稳定] 变更后构建（`npm run build`）、Lint（`npm run lint`）和现有 E2E 测试（`npx playwright test`）保持通过。
- [无 FOUC] 刷新页面时首屏无主题闪烁，React 挂载前已设置正确主题 class。

---

# 12. 待确认清单

## 已确认项（用户确认于 2026-09-17）

1. **默认主题模式**: ✅ 已确认 — 首次访问默认使用 `auto`（跟随系统偏好），系统为浅色时默认日间，系统为深色时默认夜间。
2. **主题切换控件 UI 形态**: ✅ 已确认 — 采用单个 Icon Button 循环切换（Light → Dark → Auto → Light），与现有 TopBar 按钮（语言/老人模式）风格一致，占用空间最小。
3. **夜间配色方向**: ✅ 已确认 — 采用暖色暗调，深棕灰背景（如 `#1a1815` ~ `#252220`），浅暖色文字，保持 chili 红、amber 黄品牌色识别度，与日间模式暖色调呼应。

## 冲突信息

1. **AGENTS.md 约定冲突**: AGENTS.md 记载「不引入 CSS 变量抽象层」「仅需浅色样式」「Tailwind 未配置 darkMode」，与本需求直接冲突。
   - 解决方向: 更新 AGENTS.md 中样式约定部分，启用 Tailwind `darkMode: 'class'`，允许使用 `dark:` 变体。不引入 CSS 变量抽象层，沿用 Tailwind `dark:` 变体方式与现有「类名直写模式」一致。
   - 影响: 需同步更新 AGENTS.md 中色板描述、颜色使用模式和「不要做」条款。

## 推断项（用户未提出异议，按推荐方案执行）

1. **实现方式**: 采用 Tailwind `darkMode: 'class'` + `dark:` 变体方式，不引入 CSS 变量抽象层。
2. **Hook 命名**: 新增 `useThemeMode` hook，与现有 `useElderlyMode` 命名风格一致。
3. **localStorage key**: 使用 `theme-mode` 作为 key，值为 `light`/`dark`/`auto`，与现有 `elderly-mode` key 命名风格一致。
4. **切换控件位置**: 放在 TopBar 中，紧邻现有老人模式/语言切换按钮。
5. **夜间配色具体色值**: 背景使用深棕灰 `#1a1815` ~ `#252220` 区间，文字使用浅暖色，具体色值在开发阶段根据 Tailwind dark: 变体调整确定。
6. **三态循环顺序**: Light → Dark → Auto → Light（先手动模式，后自动模式）。

---

# 13. 追溯矩阵

| REQ / NFR ID | 设计章节 | Task ID | QA 用例 | API / 埋点 / 迁移 | 证据来源 |
|--------------|----------|---------|---------|-------------------|----------|
| REQ-001 | §5 REQ-001, §10 约束 | T-001 | E2E: 主题切换 | localStorage `theme-mode` | AGENTS.md, TopBar.tsx |
| REQ-002 | §5 REQ-002, §10 约束 | T-002 | E2E: 夜间配色遍历 | Tailwind dark: 变体 | 全部组件源码 |
| REQ-003 | §5 REQ-003 | T-003 | E2E: 系统偏好跟随 | prefers-color-scheme | 无 |
| REQ-004 | §5 REQ-004 | T-004 | E2E: 持久化恢复 | index.html 脚本, localStorage | useElderlyMode.ts |
| NFR-001 | §9 NFR-001 | — | 手动验证 | — | index.css |
| NFR-002 | §9 NFR-002 | — | 对比度检查 | — | — |
| NFR-003 | §9 NFR-003 | — | E2E: 夜间+老人叠加 | — | useElderlyMode.ts |
| NFR-005 | §9 NFR-005 | — | 手动验证 | index.html 脚本 | index.html |
