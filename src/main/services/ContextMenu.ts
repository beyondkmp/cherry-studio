import { clipboard, Menu } from 'electron'

import { locales } from '../utils/locales'
import { configManager } from './ConfigManager'

export interface ContextMenuData {
  x: number
  y: number
  selectedText: string
  isEditable: boolean
  canCopy: boolean
  canPaste: boolean
  canCut: boolean
  misspelledWord?: string
  dictionarySuggestions: string[]
  editMenuItems: Array<{
    id: string
    label: string
    enabled: boolean
    visible: boolean
    type?: 'normal' | 'separator'
  }>
  inspectMenuItem: {
    id: string
    label: string
    enabled: boolean
  }
  spellCheckMenuItem?: {
    id: string
    label: string
    enabled: boolean
    visible: boolean
  }
}

class ContextMenu {
  public contextMenu(w: Electron.WebContents, isMainWindow: boolean = false) {
    w.on('context-menu', (event, properties) => {
      // 阻止默认的上下文菜单
      event.preventDefault()

      const hasText = properties.selectionText.trim().length > 0
      const isEditable = properties.isEditable

      // 只在以下情况显示右键菜单：
      // 1. 在可编辑区域（输入框、文本域等）
      // 2. 有选中的文本
      if (!isEditable && !hasText) {
        return // 不显示菜单
      }

      // 如果是主窗口，使用自定义右键菜单
      if (isMainWindow) {
        const contextMenuData = this.buildContextMenuData(properties)
        w.send('context-menu-data', contextMenuData)
      } else {
        // 如果是 webview，使用原生右键菜单
        this.showNativeContextMenu(w, properties)
      }
    })
  }

  private showNativeContextMenu(w: Electron.WebContents, properties: Electron.ContextMenuParams) {
    const locale = locales[configManager.getLanguage()]
    const { common } = locale.translation
    const hasText = properties.selectionText.trim().length > 0

    const menuItems: Electron.MenuItemConstructorOptions[] = []

    // 复制
    if (hasText && properties.editFlags.canCopy) {
      menuItems.push({
        label: common.copy,
        accelerator: 'CmdOrCtrl+C',
        click: () => w.copy()
      })
    }

    // 粘贴
    if (properties.isEditable && properties.editFlags.canPaste) {
      menuItems.push({
        label: common.paste,
        accelerator: 'CmdOrCtrl+V',
        click: () => w.paste()
      })
    }

    // 剪切
    if (properties.isEditable && hasText && properties.editFlags.canCut) {
      menuItems.push({
        label: common.cut,
        accelerator: 'CmdOrCtrl+X',
        click: () => w.cut()
      })
    }

    // 拼写建议
    if (properties.dictionarySuggestions && properties.dictionarySuggestions.length > 0) {
      if (menuItems.length > 0) {
        menuItems.push({ type: 'separator' })
      }

      properties.dictionarySuggestions.forEach((suggestion) => {
        menuItems.push({
          label: suggestion,
          click: () => w.replaceMisspelling(suggestion)
        })
      })
    }

    // 学习拼写
    if (properties.isEditable && hasText && properties.misspelledWord) {
      menuItems.push({
        type: 'separator'
      })
      menuItems.push({
        label: 'Learn Spelling',
        click: () => w.session.addWordToSpellCheckerDictionary(properties.misspelledWord)
      })
    }

    // 检查元素
    if (menuItems.length > 0) {
      menuItems.push({ type: 'separator' })
    }
    menuItems.push({
      label: common.inspect,
      accelerator: 'F12',
      click: () => w.toggleDevTools()
    })

    const menu = Menu.buildFromTemplate(menuItems)
    menu.popup()
  }

  private buildContextMenuData(properties: Electron.ContextMenuParams): ContextMenuData {
    const locale = locales[configManager.getLanguage()]
    const { common } = locale.translation
    const hasText = properties.selectionText.trim().length > 0
    const can = (type: string) => properties.editFlags[`can${type}`] && hasText

    const editMenuItems = [
      {
        id: 'copy',
        label: common.copy,
        enabled: can('Copy'),
        visible: properties.isEditable || hasText
      },
      {
        id: 'paste',
        label: common.paste,
        enabled: properties.editFlags.canPaste,
        visible: properties.isEditable
      },
      {
        id: 'cut',
        label: common.cut,
        enabled: can('Cut'),
        visible: properties.isEditable
      }
    ].filter((item) => item.visible)

    const inspectMenuItem = {
      id: 'inspect',
      label: common.inspect,
      enabled: true
    }

    let spellCheckMenuItem:
      | {
          id: string
          label: string
          enabled: boolean
          visible: boolean
        }
      | undefined = undefined

    if (properties.isEditable && hasText && properties.misspelledWord) {
      spellCheckMenuItem = {
        id: 'learnSpelling',
        label: '&Learn Spelling',
        enabled: true,
        visible: true
      }
    }

    return {
      x: properties.x,
      y: properties.y,
      selectedText: properties.selectionText,
      isEditable: properties.isEditable,
      canCopy: can('Copy'),
      canPaste: properties.editFlags.canPaste,
      canCut: can('Cut'),
      misspelledWord: properties.misspelledWord,
      dictionarySuggestions: properties.dictionarySuggestions || [],
      editMenuItems,
      inspectMenuItem,
      spellCheckMenuItem
    }
  }

  // 处理来自渲染进程的菜单项点击
  public handleMenuItemClick(webContents: Electron.WebContents, menuItemId: string, data?: any) {
    switch (menuItemId) {
      case 'copy':
        // 使用 webContents.copy() 复制选中的文本
        webContents.copy()

        // 如果数据中包含选中的文本，作为备用方案直接写入剪贴板
        if (data?.selectedText) {
          clipboard.writeText(data.selectedText)
        }
        break
      case 'paste':
        webContents.paste()
        break
      case 'cut':
        webContents.cut()
        break
      case 'inspect':
        webContents.toggleDevTools()
        break
      case 'learnSpelling':
        if (data?.misspelledWord) {
          webContents.session.addWordToSpellCheckerDictionary(data.misspelledWord)
        }
        break
      case 'replaceMisspelling':
        if (data?.replacement) {
          webContents.replaceMisspelling(data.replacement)
        }
        break
      default:
        break
    }
  }
}

export const contextMenu = new ContextMenu()
