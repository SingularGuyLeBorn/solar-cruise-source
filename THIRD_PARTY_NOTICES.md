# Third-Party Notices

本项目代码以 MIT 许可发布（见 `LICENSE`）。以下组件与素材遵循各自许可。

## 运行时依赖

| 组件                                         | 许可       | 说明                                              |
| -------------------------------------------- | ---------- | ------------------------------------------------- |
| React / React DOM                            | MIT        | UI                                                |
| three.js                                     | MIT        | WebGL 渲染                                        |
| @react-three/fiber                           | MIT        | React 与 three.js 绑定                            |
| @react-three/drei                            | MIT        | 3D 辅助组件                                       |
| @react-three/postprocessing / postprocessing | MIT        | Bloom / Vignette / ChromaticAberration            |
| @dimforge/rapier3d-compat                    | Apache 2.0 | 自动驾驶刚体物理；首次启用时动态加载              |
| zustand                                      | MIT        | 状态管理                                          |
| CesiumJS                                     | Apache 2.0 | 地球引擎；全文见 `licenses/CESIUM-APACHE-2.0.txt` |
| Vite                                         | MIT        | 构建工具                                          |

## 飞船与驾驶舱

**Helion Vanguard** — https://github.com/Bithisarea2010/Helion-Vanguard

- 许可：MIT（全文与第三方说明见 `public/models/helion/LICENSE`、`LICENSES.md`）。
- 使用：`ship_vanguard_mk3.glb`（玩家飞船）、`cockpit.glb`（第一人称驾驶舱）、`asteroid_0.glb`（小行星/小卫星基础形状）。
- 模型与原始材质由原项目在 Blender 中制作；本项目仅重新调色和缩放。
- 小行星 albedo 源自 Poly Haven “Aerial Rocks 02”（CC0），由原项目转换。

## 程序化 NPC 战机

- **threejs-vehicles v0.1.0** — AskAlice / threejs-worldgen，Apache License 2.0。
- 来源：https://github.com/AskAlice/threejs-worldgen/tree/main/packages/vehicles
- 使用：仅 vendored `MeshBuilder` 子集与 `fighterJet()` 生成器，改造为 JS 并用于 NPC 护航机的程序化外形；完整许可与修改说明见 `src/vendor/threejs-vehicles/LICENSE`、`NOTICE.md`。
- 未引入该包的 WebGPU/TSL 运行时，也未替换主角船。

## 月面与火星模型

- **Apollo Lunar Module**、**Mars 2020 Perseverance Rover** — NASA 3D Resources，https://github.com/nasa/NASA-3D-Resources 。NASA 素材按其媒体使用指南可免费使用；NASA 未认可本项目。
- **Phobos 形状/贴图模型** — 来自 [openmars-app/openmars](https://github.com/openmars-app/openmars)，MIT（`public/models/nasa/LICENSE-openmars.txt`）；原始 Phobos 形状与影像数据：NASA/JPL/USGS、Viking/Mars Global Surveyor 团队。
- **六轮月面勘察车** — [vaibhavpandeyvpz/kylr](https://github.com/vaibhavpandeyvpz/kylr)，Apache License 2.0（`public/models/lunar/LICENSE`）。该模型是原项目的原创六轮太阳能勘察车，本项目把它放在虚构的“风暴洋前哨”，不是阿波罗 LRV。
- **阿波罗 11 号脚印贴花** — NASA 公共领域影像（Apollo 11 月面脚印），裁切后用于月面贴花。

## 彗核

- **67P/Churyumov–Gerasimenko** — 形状数据：ESA/Rosetta/MPS for OSIRIS Team MPS/CSNSM/UNIBW/TU Braunschweig/UP/LA Sage/IAAS/SSO/INTA/UPM/DASP/IDA；经 [veronicanardy/caeli-view](https://github.com/veronicanardy/caeli-view) 转换为 GLB（仓库元数据为 MIT）。
- **9P/Tempel 1** — 形状数据：NASA/JPL/UMD（Stardust 任务），经同一仓库转换。
- 本项目彗核材质为简化深色风化层颜色，不是实测表面颜色。

## 天体贴图

行星、多数卫星与矮行星来自 **Solar System Scope**：

- 来源：https://www.solarsystemscope.com/textures/
- 许可：Creative Commons Attribution 4.0 International (CC BY 4.0)，全文见 `licenses/CC-BY-4.0.txt`。
- 其中没有高分辨率真实影像的天体使用 Solar System Scope 的艺术贴图，已在数据中标注为近似外观。

新增的真实探测器地图：

- **火卫一/火卫二** — Askaniy 全球地图，基于 NASA/JPL 影像，**CC BY-SA 3.0**；来源：Wikimedia Commons `Phobos map by Askaniy.png`、`Deimos map by Askaniy.png`。
- **土卫八** — NASA/JPL/SSI Cassini 彩色地图（公共领域）。
- **天卫五** — NASA/JPL/USGS Voyager 拼接图（公共领域）。
- **天卫一/二/三/四** — NASA/JPL/Caltech/USGS Voyager 地图（公共领域），原始分辨率 1440×720。
- **火星 MOLA 高程** — NASA/JPL/MOLA Science Team（公共领域），用于火星表面位移。

## 全息形态与三星堆馆藏

### Particle Field / particle-simulator

- 仓库：`D:\FunnyProjects\particle-simulator`（Particle Field）。
- 许可：MIT（代码）。
- 使用：`src/lib/holoShapes.js` 与 `src/scene/HoloFormField.jsx` 的粒子形态布局由该项目的 home layouts 改写；太阳系巡航中的 19 个程序化形态（星系、黑洞、DNA、龙卷、莫比乌斯、土星、原子、潮汐、超新星、萤火、星门、形变、彗星、团簇、星云等）为本地重写的点云版本。

### 三星堆扫描点云

- 数据：`public/artifacts/*.bin`，共 20 件，每件 262,144 点的 `Uint16` xyz 点云（运行时按需采样渲染）。
- 来源与授权：**不适用 MIT 代码许可**。各件的扫描/数字模型来源、作者、许可说明与来源仓库映射见 `public/artifacts/CREDITS.md`。
- 其中明确标注 CC BY 4.0 的模型：
  - `mask-replica` — Mark_Peach，Sketchfab，“Sanxingdui Mask Model”，CC BY 4.0。
  - `head-gold` — xian，Sketchfab，“Sanxingdui bronze head with gold mask”，CC BY 4.0。
- 其余部分来源仓库未逐件标注许可证；公开部署、再分发或商业使用前需向对应来源核实。
- 点云与展陈配色为可视化用途，不代表文物表面颜色的测量复原。

## 地球影像与地形

Cesium 视图使用以下在线服务：

- **Esri World Imagery**：影像 © Esri, Maxar, Earthstar Geographics。
- **ArcGIS WorldElevation3D**：地形服务 © Esri。
- **NASA GIBS VIIRS City Lights 2012**：城市灯光 © NASA EOSDIS GIBS。

使用时需遵守各服务的条款与署名要求；本项目不缓存、不再分发这些影像瓦片。

## 字体

- Manrope，SIL OFL 1.1：`public/fonts/OFL-Manrope.txt`
- Fraunces，SIL OFL 1.1：`public/fonts/OFL-Fraunces.txt`

## 数据与事实来源

行星/卫星半径、轨道周期、倾角、自转等公开天文数据整理自 NASA、ESA、JPL、JAXA 与 IAU 公开资料。驾驶舱内的任务/地标信息为科普性说明，不构成官方数据。

## 知识产权说明

本项目是个人练习/粉丝向的太阳系探索作品，不代表 NASA、ESA、JAXA、CNSA 或任何航天机构，也不包含这些机构的官方标志、徽章或未经许可的宣传素材。第三方模型与贴图的权利归原权利人所有；转载或再发布前请重新核对其许可。
