# 馆藏点云来源与授权 / Scan credits

本目录下的 20 个 `.bin` 是从以下开源/开放项目中公开的 3D 模型，按三角面面积加权采样得到的几何点云（每件 262,144 点，`Uint16` xyz，统一尺度与朝向）。点云不包含原始贴图或材质；模型经过减面、坐标归一化和点云采样处理。

这些文物本身属于古代作品；扫描/数字模型的权利归各来源项目与创作者。代码仓库的 MIT 许可证不覆盖本目录的数据。部分来源仓库没有逐件标注许可证，公开部署或商业使用前请向对应来源核实。

## 来源映射

| 点云 id | 来源 |
| --- | --- |
| `mask-protruding`, `figure-great`, `tree-sacred` | [fluffyfu0323/sanxingdui-showcase](https://github.com/fluffyfu0323/sanxingdui-showcase) |
| `sun-disc`, `bird-human`, `mask-frontal`, `figure-restored`, `vessel-fangjia` | [ZhiyuLin1/MuseumVR](https://github.com/ZhiyuLin1/MuseumVR) |
| `bird-branch`, `mask-replica`, `head-gold` | [jiawenlee1204/sanxingdui](https://github.com/jiawenlee1204/sanxingdui) |
| `tree-fragment`, `mask-grand`, `head-bronze`, `mask-face`, `beast-mask`, `figure-crowned` | [Zengweihaooo/Sanxingdui](https://github.com/Zengweihaooo/Sanxingdui) |
| `mask-wide`, `figure-ritual` | [GainQh/VR_SanXingDui](https://github.com/GainQh/VR_SanXingDui) |
| `figure-detail` | [WangZhewei1027/Sanxingdui-DigitalMuseum](https://github.com/WangZhewei1027/Sanxingdui-DigitalMuseum) |
| `vessel-fangjia`（方斝，13th–12th c. BCE） | [Minneapolis Institute of Art](https://artsmia.org/) open-access object；网格经 [ZhiyuLin1/MuseumVR](https://github.com/ZhiyuLin1/MuseumVR) 整理 |

## 明确标注 CC BY 4.0 的模型

- `mask-replica` — “Sanxingdui Mask Model”，作者 **Mark_Peach**，来源 [Sketchfab](https://sketchfab.com/3d-models/sanxingdui-mask-model-88a56cec000c4a68aae7920e451aee7d)，CC BY 4.0；由 `jiawenlee1204/sanxingdui` 转为网页 GLB，本项目再采样为点云。
- `head-gold` — “Sanxingdui bronze head with gold mask”，作者 **xian**，来源 [Sketchfab](https://sketchfab.com/3d-models/sanxingdui-bronze-head-with-gold-mask-31988e2d61e348619d306ba2c0a2c1a4)，CC BY 4.0；由 `jiawenlee1204/sanxingdui` 转为网页 GLB，本项目再采样为点云。

## 模型说明

- `mask-protruding`、`figure-great`、`tree-sacred` 是三星堆主题的高精度模型；`vessel-fangjia` 是商代中原青铜酒礼器。
- 部分 `残件` 的源模型本身只包含面具/头像的边缘或背范结构，因此点云呈现为残件而不是完整正面。
- 本项目的 4 色材质是**展陈配色**（铜绿、青铜本色、金色、高光），不是原器物表面颜色的测量复原。
