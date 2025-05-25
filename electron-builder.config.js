const { Arch } = require('electron-builder')

const config = {
  appId: 'com.kangfenmao.CherryStudio',
  productName: 'Cherry Studio',
  electronLanguages: [
    'zh-CN',
    'zh-TW',
    'en-US',
    'ja', // macOS/linux/win
    'ru', // macOS/linux/win
    'zh_CN', // for macOS
    'zh_TW', // for macOS
    'en' // for macOS
  ],
  directories: {
    buildResources: 'build'
  },
  files: [
    '!{.vscode,.yarn,.github}',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}',
    '!src',
    '!scripts',
    '!local',
    '!docs',
    '!packages',
    '!stats.html',
    '!*.md',
    '!**/*.{map,ts,tsx,jsx,less,scss,sass,css.d.ts,d.cts,d.mts,md,markdown,yaml,yml}',
    '!**/{test,tests,__tests__,coverage}/**',
    '!**/*.{spec,test}.{js,jsx,ts,tsx}',
    '!**/*.min.*.map',
    '!**/*.d.ts',
    '!**/{.DS_Store,Thumbs.db}',
    '!**/{LICENSE,LICENSE.txt,LICENSE-MIT.txt,*.LICENSE.txt,NOTICE.txt,README.md,CHANGELOG.md}',
    '!node_modules/rollup-plugin-visualizer',
    '!node_modules/js-tiktoken',
    '!node_modules/@tavily/core/node_modules/js-tiktoken',
    '!node_modules/pdf-parse/lib/pdf.js/{v1.9.426,v1.10.88,v2.0.550}',
    '!node_modules/mammoth/{mammoth.browser.js,mammoth.browser.min.js}'
  ],
  asarUnpack: ['resources/**', '**/*.{metal,exp,lib}'],
  win: {
    executableName: 'Cherry Studio',
    artifactName: '${productName}-${version}-${arch}-setup.${ext}',
    target: [{ target: 'nsis' }, { target: 'portable' }],
    signtoolOptions: {
      sign: 'scripts/win-sign.js'
    },
    verifyUpdateCodeSignature: false
  },
  nsis: {
    artifactName: '${productName}-${version}-${arch}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: 'always',
    allowToChangeInstallationDirectory: true,
    oneClick: false,
    include: 'build/nsis-installer.nsh',
    buildUniversalInstaller: false
  },
  portable: {
    artifactName: '${productName}-${version}-${arch}-portable.${ext}',
    buildUniversalInstaller: false
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false,
    artifactName: '${productName}-${version}-${arch}.${ext}',
    minimumSystemVersion: '20.1.0', // 最低支持 macOS 11.0
    extendInfo: [
      { NSCameraUsageDescription: "Application requests access to the device's camera." },
      { NSMicrophoneUsageDescription: "Application requests access to the device's microphone." },
      { NSDocumentsFolderUsageDescription: "Application requests access to the user's Documents folder." },
      { NSDownloadsFolderUsageDescription: "Application requests access to the user's Downloads folder." }
    ],
    target: [{ target: 'dmg' }, { target: 'zip' }]
  },
  linux: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    target: [{ target: 'AppImage' }],
    maintainer: 'electronjs.org',
    category: 'Utility',
    desktop: {
      entry: {
        StartupWMClass: 'CherryStudio'
      }
    },
    mimeTypes: ['x-scheme-handler/cherrystudio']
  },
  publish: {
    provider: 'generic',
    url: 'https://releases.cherry-ai.com'
  },
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  },
  afterPack: 'scripts/after-pack.js',
  afterSign: 'scripts/notarize.js',
  artifactBuildCompleted: 'scripts/artifact-build-completed.js',
  releaseInfo: {
    releaseNotes: `⚠️ 注意：升级前请备份数据，否则将无法降级
    增加 TokenFlux 服务商
    增加 Claude 4 模型支持
    Grok 模型增加联网能力
    小程序支持前进和后退
    修复 Windows 用户 MCP 无法启动问题
    修复无法搜索历史消息问题
    修复 MCP 代理问题
    修复精简备份恢复覆盖文件问题
    修复@模型回复插入位置错误问题
    修复搜索小程序崩溃问题`
  }
}

// 针对 Windows ARM 架构添加特殊配置
if (Arch.arm64 === 'arm64' && process.platform === 'win32') {
  config.files.push('!node_modules/libsql/client/x64/**')
}

module.exports = config
