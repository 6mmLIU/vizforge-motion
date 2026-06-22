# VizForge Motion

VizForge Motion 是一个面向内容创作者、设计师、公众号运营者和自动化工作流的高级数据可视化素材生成平台。它把 CSV、JSON、Markdown 表格和后端 API 数据转换成可直接发布的图表卡片、动态图表、微信公众号安全 SVG 以及 PNG/WebP/JPEG 图片。

项目定位可以概括为：

> 一个更适合内容传播和自动化调用的 Flourish + QuickChart 替代品。

它不是传统 BI，也不是裸 ECharts 页面。VizForge Motion 的重点是把原始数据锻造成可以放进公众号、PPT、报告、邮件、社媒图文和 n8n 自动化流程里的视觉素材。

## 核心能力

- **多格式数据输入**：支持 CSV、JSON、Markdown 表格，并可通过 API 直接传入结构化数据。
- **字段自动识别**：自动推断分类字段、时间字段、数值字段和系列字段，减少手写图表配置。
- **可视化模板系统**：内置公众号动态图卡、增长趋势折线、双线面积趋势、横向排行条形、渠道占比圆环、玫瑰构成图、Token 活动热力图和单指标快照。
- **数据驱动渲染**：图形数量由数据决定，不由模板固定。数据有多少行或聚合后有多少分类，就渲染多少个可视化单元。
- **自动色卡匹配**：用户只需要传入种子色，系统会按实际数据项数自动裁剪或扩展色卡。
- **动态 SVG 输出**：使用纯 SVG + SMIL 动画实现柱形生长、折线绘制、圆环扫出、玫瑰绽放、热力图点亮等效果。
- **微信安全模式**：不使用 JavaScript、iframe、foreignObject、外链脚本或远程资源，适合微信公众号图文嵌入。
- **静态图片导出**：同一份 SVG 可转换为 PNG、WebP 或 JPEG，保证网页预览、SVG 动画和图片导出视觉一致。
- **API 自动化调用**：提供 `/api/v1/render`，适合 Java 后端、n8n、公众号自动排版和报告生成工作流。
- **中文编辑器体验**：编辑器界面以中文为主，围绕数据输入、实时预览、模板配置和导出任务组织。

## 当前支持的图表模板

| 模板 | 类型 | 适用场景 |
| --- | --- | --- |
| 公众号动态图卡 | bar | 销售表现、增长数据、月度指标 |
| 横向排行条形 | horizontal-bar | 渠道排行、产品排行、榜单对比 |
| Token 活动热力图 | heatmap | Token 活动、签到、提交频次、内容发布节奏 |
| 增长趋势折线 | line | 时间趋势、访问量、收入变化 |
| 双线面积趋势 | area | 双系列趋势对比，例如自然流量 vs 付费广告 |
| 渠道占比圆环 | donut | 构成占比、渠道来源、预算分布 |
| 玫瑰构成图 | rose | 具有视觉传播感的构成关系 |
| 单指标快照 | metric-card | 单指标卡、核心 KPI、迷你趋势 |

## 编辑器工作流

编辑器采用三段式工作流：

1. **输入数据**：粘贴 CSV、JSON 或 Markdown 表格。
2. **实时预览**：同一份 SVG 同时用于预览和导出，确保“看到什么就导出什么”。
3. **模板与 API 配置**：选择图表类型、数据故事、主题、色卡、动画、尺寸和导出格式。

模板切换会同步更新示例 CSV、JSON、Markdown 和卡片 JSON，避免不同输入模式里的数据不一致。

## API 示例

### 请求

```http
POST /api/v1/render
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "销售表现",
  "subtitle": "最近周期销售数据",
  "visual": {
    "type": "bar",
    "story": "magnitude"
  },
  "data": [
    { "month": "2026-01", "value": 29, "channel": "自然流量" },
    { "month": "2026-02", "value": 52, "channel": "付费广告" },
    { "month": "2026-03", "value": 34, "channel": "公众号" },
    { "month": "2026-04", "value": 16, "channel": "小红书" }
  ],
  "card": {
    "periodLabel": "最近 2 周",
    "metrics": [
      { "label": "周销售额", "value": "28,441", "prefix": "$", "delta": "3.3%", "trend": "up" },
      { "label": "日销售额", "value": "4,063", "prefix": "$", "delta": "3.3%", "trend": "up" },
      { "label": "总销量", "value": 278, "delta": "3.3%", "trend": "up" }
    ]
  },
  "palette": ["#2f63d8", "#16a394", "#f06a3f", "#7b61ff"],
  "export": {
    "format": "json",
    "target": "xiaohongshu"
  }
}
```

### 响应

接口会返回：

- `assets.svg`：可复制或存储的 SVG 字符串。
- `assets.imageBase64`：图片 base64。
- `assets.imageDataUrl`：可直接用于部分自动化工具的图片 Data URL。
- `assets.palette`：本次实际使用的完整色卡。
- `meta.visual`：实际采用的图表类型和数据故事。
- `meta.mappings`：系统识别或用户指定的字段映射。
- `meta.rowCount`：输入数据行数。
- `meta.dataItemCount`：数据驱动的可视化项数。
- `meta.renderedItemCount`：当前安全上限内实际渲染的图形项数。
- `compatibility`：微信安全检测结果和评分。
- `warnings`：截断、兼容性或配置提示。

## 导出格式

支持的导出格式包括：

- `animated-svg`
- `png`
- `webp`
- `jpeg`
- `json`

当请求头 `Accept` 为 `image/png`、`image/webp` 或 `image/jpeg` 时，接口会直接返回图片二进制。

常用尺寸预设：

- `export.target: "xiaohongshu"`：1080 × 1440 竖版高清卡片，适合小红书、社媒长图。
- `export.target: "highres"` 或 `"poster"`：1440 × 1000 高清横卡，适合报告、封面和公众号配图。
- `export.target: "wechat"`：保持微信安全模式；如同时传 `width` 和 `height`，以显式尺寸为准。

## 微信安全模式

微信安全模式会避免生成以下内容：

- JavaScript
- iframe
- foreignObject
- 外链脚本
- 远程图片
- 事件处理器
- 不安全 SVG 标签和属性

动画使用 SMIL，例如：

- `animate`
- `animateTransform`
- `stroke-dashoffset`
- `opacity`
- `width`
- `height`
- `d`

## 数据契约

核心数据结构是 `VisualSpec`。推荐使用简化 API 请求格式：

```json
{
  "title": "渠道排行",
  "visual": {
    "type": "horizontal-bar",
    "story": "ranking"
  },
  "data": [
    { "channel": "自然流量", "value": 118 },
    { "channel": "付费广告", "value": 96 },
    { "channel": "公众号", "value": 82 }
  ],
  "export": {
    "format": "json",
    "target": "xiaohongshu"
  }
}
```

系统会自动补全主题、动画、字段映射和导出默认值。

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

如果 3000 被占用，可以指定端口：

```bash
npm run dev -- -p 3001
```

## 生产构建

```bash
npm run build
npm run start -- -p 3001
```

## 质量验证

项目包含数据解析、字段推断、色卡扩展、微信安全校验、SVG 渲染和图片转换测试。

```bash
npm run typecheck
npm test -- --run
npm run build
```

当前验证基线：

- TypeScript 类型检查通过。
- Vitest 全量测试通过。
- Next.js 生产构建通过。
- `/api/v1/render` 可返回 JSON、SVG 和 PNG/WebP/JPEG 图片。
- 横向条形图和 Token 活动热力图已通过 API 烟测。

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- ECharts 静态预览辅助
- Sharp 图片转换
- Zod 请求校验
- Vitest 测试

## 项目边界

VizForge Motion 不执行用户传入的 JavaScript，不渲染用户 HTML，不接受任意外部 SVG 直接注入，也不加载外部资源。AI 或自动化系统应该生成结构化 `VisualSpec`，由受控渲染器生成最终 SVG 或图片。

## 适用场景

- 微信公众号动态图表
- PPT 和周报配图
- 研究报告图表
- 小红书图文素材
- 内容运营数据卡
- n8n 自动化文章配图
- Java/Node/Python 后端图像生成 API
- 设计师可复用的数据视觉素材
