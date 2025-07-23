import React from 'react'

interface ContextMenuProps {
  children?: React.ReactNode
}

/**
 * 上下文菜单包装器组件
 * 注意：实际的全局右键菜单功能已经迁移到 GlobalContextMenu 组件
 * 这个组件保持向后兼容性
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ children }) => {
  // 这个组件现在只是一个透明的包装器
  // 实际的右键菜单功能由 GlobalContextMenu 处理
  return <>{children}</>
}

export default ContextMenu
