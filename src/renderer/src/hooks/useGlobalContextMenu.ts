import { useCallback, useEffect, useState } from 'react'

interface ContextMenuData {
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

interface UseGlobalContextMenuReturn {
  contextMenuData: ContextMenuData | null
  isVisible: boolean
  hideContextMenu: () => void
  handleMenuItemClick: (id: string, suggestion?: string) => void
}

export const useGlobalContextMenu = (): UseGlobalContextMenuReturn => {
  const [contextMenuData, setContextMenuData] = useState<ContextMenuData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // 监听来自主进程的右键菜单数据
  useEffect(() => {
    const handleContextMenuData = (data: ContextMenuData) => {
      setContextMenuData(data)
      setIsVisible(true)
    }

    // 监听 IPC 消息并返回清理函数
    const cleanup = window.api.contextMenu.onReceiveData(handleContextMenuData)

    return cleanup
  }, [])

  // 点击其他地方隐藏菜单
  useEffect(() => {
    if (!isVisible) return

    let timeoutId: NodeJS.Timeout

    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击的目标是否是菜单元素或其子元素
      const target = event.target as Element
      const contextMenu = document.querySelector('[data-context-menu]')

      if (contextMenu && (contextMenu.contains(target) || contextMenu === target)) {
        // 点击在菜单内部，不隐藏
        return
      }

      setIsVisible(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false)
      }
    }

    // 延迟添加监听器，避免与当前右键事件或其他点击事件冲突
    timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, false)
      document.addEventListener('keydown', handleEscape, false)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, false)
      document.removeEventListener('keydown', handleEscape, false)
    }
  }, [isVisible])

  // 隐藏右键菜单
  const hideContextMenu = useCallback(() => {
    setIsVisible(false)
  }, [])

  // 处理菜单项点击
  const handleMenuItemClick = useCallback((id: string, suggestion?: string) => {
    // 调用预加载脚本中的处理函数
    window.api.contextMenu.handleClick(id, suggestion)
    setIsVisible(false)
  }, [])

  return {
    contextMenuData,
    isVisible,
    hideContextMenu,
    handleMenuItemClick
  }
}
