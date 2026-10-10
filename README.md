# 冒险者之门 · 手绘笔记本登录

版本 **1.1.0**，仅适配 **Foundry VTT 13.351**。模组 ID：`portrait-login`。

[下载 v1.1.0 安装包](releases/portrait-login-v1.1.0-fvtt13.351.zip) · [更新说明](更新说明.md)

## 功能

- 手绘风格的左侧活页笔记本：登录页、角色资料页、装订环与翻页动画。
- 初始不选择角色；点击角色卡或选择绑定账户展开资料页，可单独收起。
- 默认采用 FVTT 原生背景且隐藏大立绘；可自定义默认背景和立绘。选择角色后采用对应角色图片与背景。
- 角色卡、账户绑定、小队名称、标题标语及鼠标高亮。
- GM 可视化编辑、图片浏览、导入导出和按世界发布。
- 保留 Foundry 原生认证、服务器管理及原始界面入口。
- 仅在当前世界启用模组且发布配置后显示主题，其他世界保持原生页面。

## 安装及升级

1. 停止 Foundry。把 ZIP 内的 `portrait-login` 文件夹放到 `Data/modules/`，确认存在 `Data/modules/portrait-login/module.json`。
2. 升级时先备份，合并覆盖代码，**保留 `storage/` 和世界数据**。
3. 在终端运行（需 Node.js，替换实际路径）：

```sh
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --install
```

程序目录是含 `package.json`、`main.mjs`、`templates` 和 `dist` 的 Foundry 程序目录，不是 Data 目录。Windows 桌面版通常为 `C:/Program Files/Foundry Virtual Tabletop/resources/app`，写入此处需要管理员权限。

4. 完全重启 Foundry，在目标世界启用模组。
5. GM 进入“配置设置 → 模组设置 → 配置角色立绘与账户”，编辑后点击“保存并发布”。刷新 `/join` 查看；升级后按 Ctrl+F5。

**仅在模组管理中安装或更新，不会自动执行接入工具。** 本工具仅适配 13.351，修改登录模板及登录路由，并为两者分别创建 `.portrait-login-backup`。旧版接入可直接通过新版 `--install` 升级，不重复注入。

```sh
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --check
node "<Data目录>/modules/portrait-login/tools/install.mjs" --app "<Foundry程序目录>" --restore
```

卸载前停止 Foundry，运行 `--restore`，再重启。恢复只移除本模组接入，并保留其他改动和备份。升级 Foundry 后需重新确认兼容性，不应直接绕过版本检查。

## 编辑方式

- “角色与页面”面板管理角色、图片、绑定账户、默认页及页面文字。
- 选择“未选择角色（默认页）”预览初始画面；页面设置中的默认背景留空使用原生背景，默认大立绘留空则隐藏。
- 笔记本内文字和顶部标语可双击编辑；介绍和特征按 Enter 换行，Ctrl+Enter 完成。关闭窗口不发布草稿。
- 笔记本与标语固定排版；立绘和角色卡区域仍可拖动、Ctrl+滚轮缩放及拖动控点调整尺寸。
- 默认立绘和角色立绘的布局分别保存。角色布局复制、重置、图片分栏、垂直位置功能保留。
- 选择角色后的背景优先级：角色背景 → 默认背景 → FVTT 原生背景。选中角色的大立绘留空时继续使用角色卡图片。
- 页面设计以桌面为主；角色较多可在角色卡区域横向滚动，长介绍在资料页内滚动。

## 配置与隐私

编辑器使用世界设置 `portrait-login.config`，发布先写 `storage/<世界ID>.json`，再保存世界设置。登录页只读取该世界已发布配置，无有效配置时保留原生页面。`config.json` 为可导入的示例，不自动覆盖世界配置。

新增字段 `idleHero` 保存默认页立绘路径，`idleHeroLayout` 保存其布局；`background` 为默认背景。原角色、文字及布局字段继续兼容。图片支持 Data 相对路径、HTTP(S)，以及 `@/` 模组相对路径。

发布数据供未登录用户读取，包含隐藏角色的文字、图片和账户 ID。“隐藏”只控制展示，不保护秘密信息；不要写入密码或私密角色资料。安装包不含个人世界配置。

## 排查

- 新世界仍有主题：执行新版接入器 `--install` 后完全重启。
- 启用后仍是原生页面：检查是否发布配置、是否带有 `portraitLoginOff` 参数。
- 样式未更新：Ctrl+F5；编辑器关闭后重新打开。
- 临时使用原生界面：打开 `/join?portraitLoginOff=1`。
- 发布失败：确认 GM 权限及 Data 目录写入权限。

## 开发与验证

直接运行的 ES Modules 与 CSS，无需 npm 构建。维护约定见 [agent.md](agent.md)，验证范围见 [更新说明.md](更新说明.md)。

```sh
node --test tests/world-scope.test.mjs
node --check scripts/model.mjs
node --check scripts/scene.mjs
node --check scripts/settings.mjs
node --check scripts/login.mjs
node --check tools/install.mjs
```

示例素材说明：[assets/ARTWORK.md](assets/ARTWORK.md)。
