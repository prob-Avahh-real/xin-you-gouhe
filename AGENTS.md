# xin-you-gouhe

心有沟壑 3D 实时高清地球仪 — 国内版聚焦中国版图，国外版按七大洲分区浏览全球。 功能 - Cesium 3D 地球仪，大气辉光 + 实时地形 - Esri L19 / Mapbox @2x / 天地图 WMTS 高清瓦片 - 移动端 Capacitor（iOS / Android）+ 手表小屏适配 - 智能戒指倾斜旋转 · 手杖挥动切换大洲 快速开始 cd xin-you-gouhe npm install cp .env.example .env # 填入地图 API Key（可选，未配置使用 Esri 高清影像）

## 用途与 Target 判定

心有沟壑 Capacitor+穿戴

- 移动端：需要
- 智能硬件：需要

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| Android | Capacitor / 原生 | APK |
| 手表 | 窄屏适配 | 同 App |
| 智能戒指 | DeviceOrientation / 专用 SDK | — |
| 智能手杖或其他硬件 | DeviceMotion / BLE / 固件 | — |

## 技术栈信号

- 检测到：capacitor, node

## 命令

```bash
npm install
npm run build
npm run dev
```

## 状态

已归档。默认只做必要修复与知识库同步，不新开大范围需求。

## 同步说明

Web 变更后 `npm run build`（若有）→ `npx cap sync`。打 APK 使用 JDK 17。

## 智能硬件约定

- 戒指：DeviceOrientation；手杖：DeviceMotion；手表窄屏 CSS
- 复用 shared / 兄弟项目模块，避免复制漂移

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `/Users/skat/AGENTS.md` 与本文件的用途判定
- 可选 Target 可搁置；不适用形态不要硬加
- 改动聚焦；公共逻辑抽离复用
