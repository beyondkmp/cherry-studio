import React from 'react'

interface ContextMenuProps {
  children: React.ReactNode
}

const ContextMenu: React.FC<ContextMenuProps> = ({ children }) => {
  // 现在只是一个透明的包装器
  // 真正的上下文菜单由 GlobalContextMenu 组件处理
  return <>{children}</>
}

export default ContextMenu
