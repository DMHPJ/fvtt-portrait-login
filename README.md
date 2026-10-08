# 冒险者之门 · 角色立绘登录

为 **Foundry Virtual Tabletop 13.351** 的世界登录页添加角色立绘、横排角色卡、背景与账户联动，并提供世界内的 GM 可视化配置界面。

模组 ID：`portrait-login` · 当前版本：`1.0.0`

## 功能

- 点击角色卡切换大立绘、介绍、主题色和角色背景，可绑定原生 Foundry 登录账户。
- 设置页面标题、标语、全局背景、角色卡高度，以及独立的卡片图和大立绘。
- 新增、删除、排序和隐藏角色；从用户已分配的角色导入名字与图片。
- 导入、导出 JSON 配置，按世界保存并发布。
- GM 设置为 `100vw × 100vh` 的全屏登录页编辑器，支持拖动、Ctrl + 滚轮缩放和双击修改文字。
- 支持角色卡键盘左右切换和在线账户提示；登录页固定一屏，禁止页面滚动，暂不适配小屏幕与移动端。
- 保留 Foundry 原生登录验证、服务器管理入口和原始界面回退。

## 工作方式与适用范围

项目包含两个入口：

| 入口 | 加载方式 | 用途 |
| --- | --- | --- |
| 世界内配置 | 启用模组后加载 `scripts/settings.mjs` 与 `styles/settings.css` | GM 编辑、发布配置 |
| 世界登录页 | 接入工具向 Foundry 的 `templates/views/join.hbs` 添加 `scripts/login.mjs` 与 `styles/login.css` | 展示角色并联动原生表单 |

**只启用模组不会改变登录页，还需要运行接入工具。** 接入修改的是该 Foundry 程序的登录模板；其他世界打开登录页时也会加载主题，没有已发布配置的世界会使用默认示例。世界内禁用模组不会移除模板接入。

当前接入工具仅接受 **13.351**，不保证其他 v13 构建或其他大版本兼容。项目无需 npm 安装或打包；运行接入工具需要支持 ES Modules 的 Node.js，以及对 Foundry 程序目录的写入权限。GM 发布配置还需要 Foundry 数据目录可写。

## 安装

1. 找到 Foundry 实际使用的 `Data` 文件夹，将整个项目放到其下的 `modules/portrait-login/`，确认 `Data/modules/portrait-login/module.json` 存在。
2. 停止 Foundry 服务或完全退出桌面程序。
3. 使用接入工具检查并安装。下例中 `<Data目录>` 指包含 `modules` 的目录，`<Foundry程序目录>` 指包含 Foundry 自身 `package.json`、`main.mjs` 和 `templates` 的目录；请替换为实际路径。

```sh
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --check
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --install
```

Windows 桌面版常见程序目录示例：

```text
C:/Program Files/Foundry Virtual Tabletop/resources/app
```

从本项目目录执行时，命令示例为：

```powershell
node ./tools/install.mjs --app "C:/Program Files/Foundry Virtual Tabletop/resources/app" --install
```

4. 重启 Foundry，进入目标世界，用 GM 账户登录，在“管理模组”中启用“冒险者之门 · 角色立绘登录”。
5. 打开“配置设置 → 模组设置 → 配置角色立绘与账户”，编辑后点击“保存并发布”。
6. 刷新该服务器原有的 `/join` 页面查看效果；部署在子路径下时沿用原登录地址。

`--check` 输出版本、是否存在接入标记、是否存在备份及模板路径；它不验证主题资源是否可访问，也不进行登录测试。首次安装会创建 `templates/views/join.hbs.portrait-login-backup`；重复安装检测到标记后不再添加。工具遇到不支持的版本、无法识别的模板或已有备份冲突时会停止，应先核对目标文件。

## 配置角色与图片

进入配置窗口后直接在登录页预览上编辑。没有绑定账户的卡片仍可展示，玩家可在原生账户下拉框中自行选择账户。

- 拖动姓名、称号 / 职业、大立绘、介绍、底部特征文字、登录卡片或角色选择器，调整位置；鼠标悬停在对应内容上，按住 Ctrl 并滚动滚轮即可缩放（25%–300%）。
- 双击姓名、称号 / 职业、介绍或特征文字进行修改，空白文字也有可编辑区域。按 Enter 或点击其他位置完成；介绍中按 Shift + Enter 换行；Esc 取消本次文字修改。
- 点击角色卡切换编辑对象。前五项布局按角色单独保存；登录卡片和角色选择器布局由所有角色共用。
- 点击右上角“角色与页面”打开设置面板，可增删、排序、隐藏角色，绑定账户、选择图片、设置页面背景、导入导出或重置布局。隐藏角色仍可在编辑器中选择。
- 编辑时登录卡片仅用于预览，不能输入密码或提交登录。关闭编辑器不会发布草稿；完成后点击“保存并发布”。
- 页面本身不滚动；角色较多时，可在角色选择器内部横向滚动。

- 大立绘留空时使用卡片图；角色背景留空时使用全局背景。
- 自定义图片选择“自定义图片（不分栏）”。在窗口里编辑或浏览卡片图片时，会自动取消示例分栏。
- “导入玩家已分配角色”会添加有已分配角色且尚未绑定到现有卡片的用户，使用其角色名字、图片和用户名，不覆盖已有卡片。
- “导出配置”包含当前窗口已填写的内容；“导入配置”载入编辑草稿，仍需点击“保存并发布”。导入要求 JSON 含 `characters` 数组，文件大小不超过 1,000,000 字节。
- 发布后刷新登录页才会读取新配置；已打开的登录页不会自动重新加载配置文件。

图片路径支持以下形式：

| 写法 | 含义 |
| --- | --- |
| `@/assets/party.png` | 模组目录中的示例图片 |
| `assets/heroes/ranger.webp` | Foundry 数据目录中可通过服务访问的资源 |
| `https://example.com/ranger.webp` | 浏览器可访问的 HTTP(S) 图片地址 |

不要填写 `C:/...` 或 `file://...` 本机文件路径。推荐用配置窗口中的文件浏览按钮选择 Foundry 资源。

### 配置字段

默认示例见 [config.json](config.json)，字段清理由 [scripts/model.mjs](scripts/model.mjs) 的 `normalize()` 统一处理。

| 全局字段 | 说明 |
| --- | --- |
| `title` | 页面标题，最多 80 字符 |
| `subtitle` | 副标题，最多 250 字符 |
| `eyebrow` | 上方标语，最多 80 字符 |
| `background` | 全局背景路径，可留空 |
| `accent` | 六位十六进制强调色，例如 `#c8aa71` |
| `cardHeight` | 卡片高度，限制在 100–260，默认 158 |
| `layout` | 共享布局，包含 `login`（登录卡片）、`roster`（角色选择器） |
| `characters` | 按展示顺序排列的角色数组；规范化时最多保留前 60 项，空数组显示手动登录提示 |

| 角色字段 | 说明 |
| --- | --- |
| `id` | 用于选择和渲染的角色标识，应保持唯一、稳定，最多 80 字符 |
| `name`、`tag` | 名称与称号，各最多 80 字符 |
| `description`、`detail` | 介绍与底部特征文字，分别最多 1500、160 字符 |
| `userId` | Foundry 用户 ID；空值表示不绑定 |
| `portrait`、`hero`、`background` | 卡片图、大立绘、专属背景路径；各最多 1000 字符 |
| `color` | 六位十六进制角色强调色，无效值回退至全局强调色 |
| `strip` | `0–4` 表示示例合影的五个分栏，`null` 表示自定义图；单独设置的 `hero` 不分栏 |
| `position` | 自定义图的垂直位置百分比，限制在 0–100；`0` 有效 |
| `enabled` | `false` 时不展示该角色，其他值视为展示 |
| `layout` | 当前角色的布局，包含 `name`、`tag`、`hero`、`description`、`detail` |

每个布局项为 `{ "x": 5, "y": 28, "scale": 1 }`：`x`、`y` 是相对于完整页面宽高的左上角位置百分比（0–100），`scale` 是缩放倍数（0.25–3），以元素左上角为缩放原点。缺少布局字段的旧配置会自动补齐默认布局。布局随 JSON 导入、导出和发布保存；编辑器和登录页使用相同的渲染与样式。

### 保存位置与公开范围

编辑窗口从当前世界设置 `portrait-login.config` 读取配置。“保存并发布”先写入公开文件，再保存世界设置：

```text
Data/modules/portrait-login/storage/<世界ID>.json
```

登录页依次尝试：当前世界的已发布 JSON → 根目录 `config.json` → `scripts/model.mjs` 中的内置默认数据。获取或解析失败时继续尝试下一项；无法取得世界 ID 时跳过世界文件。

编辑 `config.json` 不会覆盖已发布的世界配置，也不会自动同步到世界内的配置窗口。手动编辑 `storage/` 下的文件同样不会更新世界设置，之后从窗口发布可能覆盖手工修改；日常修改建议使用配置窗口及其导入功能。

发布的 JSON 供未登录的浏览器读取，包含角色文案、图片路径、绑定账户 ID 和隐藏角色。**隐藏只控制页面展示。** 请仅填写适合公开的资料；模组不将密码写入配置，也不会在登录页读取 Actor 的属性、装备或秘密内容。更新模组时保留 `storage/`，并备份重要配置。

## 恢复、更新与排查

临时使用原生页面：点击右上角“原始界面”，或在登录地址添加 `?portraitLoginOff=1`；已有查询参数时使用 `&portraitLoginOff=1`。

完整移除接入：停止 Foundry，执行以下命令，再重启：

```sh
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --restore
```

恢复工具移除本主题标记块；当移除后的内容与原备份一致时还原原始文件，否则保留模板上的其他改动。备份文件会保留。准备删除模组目录时，先恢复模板。

Foundry 升级可能覆盖模板接入。升级后先确认版本和模板，再检查接入状态；新版本需要重新适配与实测，不能仅绕过版本检查。原有 [使用说明.md](使用说明.md) 中的安装位置和演示世界属于历史环境，不是本项目自动创建的内容。

| 现象 | 检查方式 |
| --- | --- |
| 启用模组后登录页未变化 | 检查是否运行接入工具、是否重启 Foundry、访问地址是否带有 `portraitLoginOff` 参数 |
| 仍显示默认角色 | 在目标世界保存并发布，再刷新；检查 `storage/<世界ID>.json` 是否生成且可被浏览器读取 |
| 配置发布失败 | 查看窗口错误信息，确认 GM 权限及 Data 目录写入权限；修正后重新发布 |
| 图片不显示或裁切异常 | 检查资源地址是否可访问、自定义图是否取消分栏、垂直位置是否合适 |
| 卡片无法选中绑定账户 | 检查账户是否存在、是否在线，以及绑定的用户 ID 是否属于当前世界 |
| 接入工具拒绝安装 | 核对实际版本是否为 13.351、`--app` 是否指向程序目录、模板与备份是否有其他改动 |

## 开发与验证

```text
portrait-login/
├── module.json              # 模组清单
├── config.json              # 默认示例配置
├── scripts/
│   ├── model.mjs            # 共享模型、路径与图片处理
│   ├── scene.mjs            # 登录页与编辑器共用的内容和布局渲染
│   ├── login.mjs            # 登录页增强
│   └── settings.mjs         # GM 配置与发布
├── styles/
│   ├── login.css            # 登录页样式
│   ├── scene.css            # 共用全屏场景样式
│   └── settings.css         # 配置窗口样式
├── tools/install.mjs        # 接入、检查和恢复工具
├── assets/                  # 示例图片及素材说明
├── storage/                 # 各世界已发布配置
├── agent.md                 # 项目维护约定
├── README.md                # 通用使用与开发说明
├── 使用说明.md              # 历史环境操作说明
└── 测试结果.json            # 历史测试摘要
```

开发时直接编辑 `.mjs`、`.css` 与 JSON 文件。登录脚本需要 Foundry 的原生登录 DOM；配置窗口需要世界内的 `game`、`Hooks`、`ApplicationV2` 和 `FilePicker`，普通静态服务器不能完整验证这些功能。

在项目根目录进行 JavaScript 语法检查：

```sh
node --check scripts/model.mjs
node --check scripts/scene.mjs
node --check scripts/login.mjs
node --check scripts/settings.mjs
node --check tools/install.mjs
```

登录与配置行为需在真实 Foundry 13.351 中验证：重点覆盖正确/错误密码、GM 与玩家登录、在线账户、角色卡切换导致账户变化时清空密码、手动选择账户、管理员入口、原始界面回退、配置发布、桌面全屏布局，以及拖动、缩放和双击文字编辑。当前不要求小屏幕和移动端适配。安装器改动先在临时模板目录验证备份、重复安装、恢复和版本拒绝。

[测试结果.json](测试结果.json) 记录了此前在 13.351 上的验证摘要，包括真实登录、配置发布、390px 移动端和安装恢复等；它不是自动化测试脚本，也不表示当前环境已经重跑这些检查。后续维护约定见 [agent.md](agent.md)。

示例合影及来源说明见 [assets/ARTWORK.md](assets/ARTWORK.md)，生成提示保存在 [assets/generation-prompt.txt](assets/generation-prompt.txt)。
