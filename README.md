# 心有沟壑

3D 实时高清地球仪 — 国内版聚焦中国版图，国外版按七大洲分区浏览全球。

## 功能

| 版本 | 说明 |
|------|------|
| **国内版** | 默认视角中国中心，天地图高清卫星 + 中文注记 |
| **国外版** | 3D 地球仪全球视图，七大洲独立版图一键聚焦 |

- Cesium 3D 地球仪，大气辉光 + 实时地形
- Esri L19 / Mapbox @2x / 天地图 WMTS 高清瓦片
- 移动端 Capacitor（iOS / Android）+ 手表小屏适配
- 智能戒指倾斜旋转 · 手杖挥动切换大洲

## 快速开始

```bash
cd xin-you-gouhe
npm install
cp .env.example .env   # 填入地图 API Key（可选，未配置使用 Esri 高清影像）
npm run dev            # http://localhost:5173
```

## 地图 Key（推荐配置以获得最高清晰度）

| 变量 | 用途 | 申请 |
|------|------|------|
| `VITE_TIANDITU_KEY` | 国内版天地图卫星 | https://console.tianditu.gov.cn/ |
| `VITE_MAPBOX_TOKEN` | 国外版超清卫星 @2x | https://account.mapbox.com/ |
| `VITE_CESIUM_ION_TOKEN` | 全球地形数据 | https://ion.cesium.com/ |

## 移动端打包

```bash
npm run build
npx cap add ios      # 首次
npx cap add android  # 首次
npm run sync
npm run ios          # 或 npm run android
```

## 智能硬件操作

| 设备 | 手势 | 效果 |
|------|------|------|
| 智能戒指 | 倾斜 | 旋转地球视角 |
| 智能戒指 | 甩动 | 国外版：切换下一个大洲 |
| 智能手杖 | 挥动 | 国外版：左右切换大洲 |
| 智能手杖 | 敲击 | 复位当前版本默认视角 |
| **智能眼镜** | 转头 | 头部追踪环视地球 |
| **智能眼镜** | 语音 | 国内版/大洲/放大/复位/校准等 |

### 智能眼镜语音命令

| 命令 | 效果 |
|------|------|
| 国内版 / 国外版 | 切换版本 |
| 亚洲 / 欧洲 / 非洲 / 北美 / 南美 / 大洋洲 / 南极 | 聚焦大洲 |
| 全球 / 放大 / 缩小 / 复位 | 视图控制 |
| 下一个 / 上一个 | 切换大洲 |
| 校准 / 设置 | 头部重校准 / 打开设置 |

眼镜模式自动检测窄 FOV（≤420×340），启动语音与头部追踪。

## 项目结构

```
src/
  config/       # 大洲边界、地图源配置
  globe/        # Cesium 地球仪核心
  devices/      # 戒指 / 手杖 / 眼镜输入
  app.ts        # UI 绑定
```

## 技术栈

- **渲染**：CesiumJS 1.128
- **构建**：Vite 6 + TypeScript
- **移动**：Capacitor 6
