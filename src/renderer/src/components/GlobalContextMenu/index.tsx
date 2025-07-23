import { useTranslation } from 'react-i18next'
import styled, { keyframes } from 'styled-components'

import { useGlobalContextMenu } from '../../hooks/useGlobalContextMenu'

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`

const MenuContainer = styled.div<{ $x: number; $y: number; $show: boolean }>`
  position: fixed;
  top: ${(props) => props.$y}px;
  left: ${(props) => props.$x}px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  z-index: 99999;
  min-width: 180px;
  padding: 4px;
  display: ${(props) => (props.$show ? 'block' : 'none')};
  animation: ${fadeIn} 0.15s ease-out;
`

const MenuItem = styled.div<{ $enabled: boolean; $separator?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${(props) => (props.$separator ? '4px 0' : '8px 12px')};
  border-radius: 4px;
  cursor: ${(props) => (props.$enabled ? 'pointer' : 'default')};
  color: ${(props) => (props.$enabled ? 'var(--color-text)' : 'var(--color-text-3)')};
  font-size: 13px;
  transition: background-color 0.15s ease;
  user-select: none;
  gap: 8px;

  ${(props) =>
    props.$separator &&
    `
    border-bottom: 1px solid var(--color-border);
    margin: 4px 8px;
    padding: 0;
    height: 1px;
    background: none;
  `}

  &:hover {
    background-color: ${(props) => (props.$enabled ? 'var(--color-background-mute)' : 'transparent')};
  }

  &:active {
    background-color: ${(props) => (props.$enabled ? 'var(--color-background-soft)' : 'transparent')};
  }
`

const MenuLabel = styled.span``

const KeyboardShortcut = styled.span`
  margin-left: auto;
  color: var(--color-text-3);
  font-size: 11px;
`

const SuggestionItem = styled(MenuItem)`
  font-weight: 500;
  color: var(--color-primary);
`

const GlobalContextMenu: React.FC = () => {
  const { t } = useTranslation()
  const { contextMenuData, isVisible, hideContextMenu, handleMenuItemClick } = useGlobalContextMenu()

  // 如果没有菜单数据或不可见，返回 null
  if (!contextMenuData || !isVisible) {
    return null
  }

  // 调整菜单位置，确保不会超出屏幕边界
  const adjustPosition = (x: number, y: number, menuItemCount: number, hasSpellSuggestions: boolean) => {
    const menuWidth = 200
    const itemHeight = 32 // 每个菜单项的高度
    const padding = 8 // 菜单容器的内边距
    const menuHeight = Math.min(menuItemCount * itemHeight + padding * 2, 400) // 限制最大高度

    let adjustedX = x
    let adjustedY = y

    // 检查右边界 - 优先保持在鼠标右侧，如果不够空间再移到左侧
    if (x + menuWidth > window.innerWidth - 10) {
      adjustedX = Math.max(10, x - menuWidth)
    }

    // 特殊处理：如果有拼写建议，优先显示在鼠标上方，让菜单底部对齐鼠标位置
    if (hasSpellSuggestions) {
      adjustedY = y - menuHeight
      // 如果上方空间不够，再尝试其他位置
      if (adjustedY < 10) {
        // 上方空间不够，检查下方是否有足够空间
        if (y + menuHeight <= window.innerHeight - 10) {
          adjustedY = y // 显示在鼠标下方
        } else {
          // 上下都不够，居中显示
          adjustedY = Math.max(10, (window.innerHeight - menuHeight) / 2)
        }
      }
    } else {
      // 没有拼写建议时，使用原来的逻辑
      // 检查底部边界 - 优先保持在鼠标下方，如果不够空间再移到上方
      if (y + menuHeight > window.innerHeight - 10) {
        adjustedY = Math.max(10, y - menuHeight)
      }
    }

    // 最终边界检查
    adjustedX = Math.max(10, Math.min(adjustedX, window.innerWidth - menuWidth - 10))
    adjustedY = Math.max(10, Math.min(adjustedY, window.innerHeight - menuHeight - 10))

    return { x: adjustedX, y: adjustedY }
  }

  const onMenuItemClick = (menuItemId: string, data?: any) => {
    if (menuItemId === 'quote' && contextMenuData?.selectedText) {
      // 保留原有的引用功能
      window.api?.quoteToMainWindow(contextMenuData.selectedText)
    } else {
      // 其他菜单项通过 IPC 发送到主进程处理，包含选中的文本
      handleMenuItemClick(menuItemId, {
        ...data,
        selectedText: contextMenuData?.selectedText,
        misspelledWord: contextMenuData?.misspelledWord
      })
    }
    hideContextMenu()
  }

  const renderMenuItem = (item: { id: string; label: string; enabled: boolean }, shortcut?: string) => (
    <MenuItem
      key={item.id}
      $enabled={item.enabled}
      onClick={(e) => {
        e.stopPropagation()
        if (item.enabled) {
          onMenuItemClick(item.id)
        }
      }}>
      <MenuLabel>{item.label}</MenuLabel>
      {shortcut && <KeyboardShortcut>{shortcut}</KeyboardShortcut>}
    </MenuItem>
  )

  const renderSeparator = (key: string) => <MenuItem key={key} $enabled={false} $separator />

  const menuItems: React.ReactNode[] = []

  // 拼写建议
  if (contextMenuData.dictionarySuggestions.length > 0) {
    contextMenuData.dictionarySuggestions.forEach((suggestion, index) => {
      menuItems.push(
        <SuggestionItem
          key={`suggestion-${index}`}
          $enabled={true}
          onClick={(e) => {
            e.stopPropagation()
            onMenuItemClick('replaceMisspelling', { replacement: suggestion })
          }}>
          <MenuLabel>{suggestion}</MenuLabel>
        </SuggestionItem>
      )
    })
    menuItems.push(renderSeparator('separator-suggestions'))
  } else if (contextMenuData.misspelledWord) {
    menuItems.push(
      <MenuItem key="no-suggestions" $enabled={false}>
        <MenuLabel>No Guesses Found</MenuLabel>
      </MenuItem>
    )
    menuItems.push(renderSeparator('separator-no-suggestions'))
  }

  // 学习拼写
  if (contextMenuData.spellCheckMenuItem?.visible) {
    menuItems.push(renderMenuItem(contextMenuData.spellCheckMenuItem))
    menuItems.push(renderSeparator('separator-spell'))
  }

  // 编辑菜单项
  contextMenuData.editMenuItems.forEach((item) => {
    const shortcuts: Record<string, string> = {
      copy: 'Ctrl+C',
      paste: 'Ctrl+V',
      cut: 'Ctrl+X'
    }
    menuItems.push(renderMenuItem(item, shortcuts[item.id]))
  })

  // 引用功能（仅当有选中文本时显示）
  if (contextMenuData.selectedText) {
    if (menuItems.length > 0) {
      menuItems.push(renderSeparator('separator-before-quote'))
    }
    menuItems.push(
      renderMenuItem({
        id: 'quote',
        label: t('chat.message.quote'),
        enabled: true
      })
    )
  }

  // 开发者工具
  if (menuItems.length > 0) {
    menuItems.push(renderSeparator('separator-before-inspect'))
  }
  menuItems.push(renderMenuItem(contextMenuData.inspectMenuItem, 'F12'))

  // 计算调整后的位置（在构建完菜单项之后）
  const hasSpellSuggestions = contextMenuData.dictionarySuggestions.length > 0
  const { x: adjustedX, y: adjustedY } = adjustPosition(
    contextMenuData.x,
    contextMenuData.y,
    menuItems.length,
    hasSpellSuggestions
  )

  return (
    <MenuContainer $x={adjustedX} $y={adjustedY} $show={isVisible} data-context-menu>
      {menuItems}
    </MenuContainer>
  )
}

export default GlobalContextMenu
