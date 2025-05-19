import Logger from '@renderer/config/logger'
import { FileType } from '@renderer/types'
import { getFileExtension } from '@renderer/utils'
import { documentExts, imageExts, textExts } from '@shared/config/constant'
import i18n from '@renderer/i18n'

// 定义处理粘贴事件的处理器接口
type PasteHandler = {
  id: string
  onPaste: (event: ClipboardEvent) => void
  isModelVision: boolean
  supportExts: string[]
  isDefault?: boolean // 是否为默认处理器
}

// 最后一个聚焦的处理器
let lastFocusedHandler: PasteHandler | null = null
// 默认处理器(通常是输入框)
let defaultHandler: PasteHandler | null = null

// 全局粘贴事件监听器
let isListening = false
let cleanupListener: (() => void) | null = null

// 设置全局粘贴事件监听器
const setupGlobalPasteListener = () => {
  if (isListening) return cleanupListener

  const handleGlobalPaste = (event: ClipboardEvent) => {
    // 如果当前有输入元素聚焦，不处理粘贴事件
    const active = document.activeElement as HTMLElement
    if (active?.isContentEditable || active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') {
      return
    }

    // 优先使用最后聚焦的编辑器，如果没有或者已经销毁，则使用默认编辑器(Inputbar)
    if (lastFocusedHandler) {
      Logger.log('[PasteService] Handling paste with:', lastFocusedHandler.id)
      lastFocusedHandler.onPaste(event)
    } else if (defaultHandler) {
      Logger.log('[PasteService] Handling paste with default handler:', defaultHandler.id)
      defaultHandler.onPaste(event)
    }
  }

  document.addEventListener('paste', handleGlobalPaste)
  isListening = true

  cleanupListener = () => {
    document.removeEventListener('paste', handleGlobalPaste)
    isListening = false
    cleanupListener = null
  }

  return cleanupListener
}

/**
 * 注册一个粘贴事件处理器
 */
export const registerPasteHandler = (
  id: string,
  onPaste: (event: ClipboardEvent) => void,
  isModelVision: boolean,
  isDefault = false
): (() => void) => {
  Logger.log('[PasteService] Registering paste handler:', id, isDefault ? '(default)' : '')

  const supportExts = [...textExts, ...documentExts, ...(isModelVision ? imageExts : [])]

  const handler: PasteHandler = { id, onPaste, isModelVision, supportExts, isDefault }

  // 如果是默认处理器或者目前还没有处理器，则设置为lastFocusedHandler
  if (isDefault) {
    defaultHandler = handler
    // 如果没有其他活跃处理器，也设置为最后聚焦的处理器
    if (!lastFocusedHandler) {
      lastFocusedHandler = handler
    }
  } else {
    // 非默认处理器，设置为最后聚焦的处理器
    lastFocusedHandler = handler
  }

  // 确保全局粘贴监听器已设置
  setupGlobalPasteListener()

  // 返回取消注册函数
  return () => {
    if (lastFocusedHandler?.id === id) {
      Logger.log('[PasteService] Unregistering last focused handler:', id)
      // 如果当前正在卸载的处理器是最后聚焦的，则重置为默认处理器
      lastFocusedHandler = defaultHandler
    }

    if (defaultHandler?.id === id) {
      Logger.log('[PasteService] Unregistering default handler:', id)
      defaultHandler = null
    }
  }
}

/**
 * 设置为当前活跃的处理器
 */
export const setActiveHandler = (id: string) => {
  // 如果要设置的处理器就是当前处理器，则不做任何操作
  if (lastFocusedHandler?.id === id) {
    return
  }

  // 如果是默认处理器的ID，就使用已保存的默认处理器实例
  if (defaultHandler?.id === id) {
    Logger.log('[PasteService] Setting default handler as active:', id)
    lastFocusedHandler = defaultHandler
    return
  }

  // 否则，创建一个新的处理器引用
  if (lastFocusedHandler) {
    Logger.log('[PasteService] Setting active handler:', id)
    lastFocusedHandler = { ...lastFocusedHandler, id }
  }
}

/**
 * 重置为默认处理器
 */
export const resetToDefaultHandler = () => {
  if (defaultHandler) {
    Logger.log('[PasteService] Resetting to default handler:', defaultHandler.id)
    lastFocusedHandler = defaultHandler
  }
}

/**
 * 处理粘贴文件的通用工具函数
 */
export const handleFilePaste = async (
  event: ClipboardEvent,
  isModelVision: boolean,
  isGenerateImageModel: boolean,
  supportExts: string[],
  setFiles: (updateFn: (prevFiles: FileType[]) => FileType[]) => void,
  onLongTextPaste?: (text: string) => Promise<void>,
  pasteLongTextAsFile?: boolean,
  pasteLongTextThreshold?: number
): Promise<boolean> => {
  // 处理文本粘贴
  const clipboardText = event.clipboardData?.getData('text')
  if (clipboardText) {
    if (pasteLongTextAsFile && pasteLongTextThreshold && clipboardText.length > pasteLongTextThreshold) {
      // 长文本直接转文件
      event.preventDefault()

      if (onLongTextPaste) {
        await onLongTextPaste(clipboardText)
        return true
      }

      const tempFilePath = await window.api.file.create('pasted_text.txt')
      await window.api.file.write(tempFilePath, clipboardText)
      const selectedFile = await window.api.file.get(tempFilePath)

      if (selectedFile) {
        setFiles((prevFiles) => [...prevFiles, selectedFile])
        return true
      }
    }
    // 短文本让默认处理
    return false
  }

  // 处理文件/图片粘贴
  if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
    event.preventDefault()
    let processed = false

    for (const file of event.clipboardData.files) {
      try {
        const filePath = window.api.file.getPathForFile(file)

        // 如果没有路径，可能是剪贴板中的图像数据
        if (!filePath) {
          if (file.type.startsWith('image/') && (isModelVision || isGenerateImageModel)) {
            const tempFilePath = await window.api.file.create(file.name)
            const arrayBuffer = await file.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)
            await window.api.file.write(tempFilePath, uint8Array)
            const selectedFile = await window.api.file.get(tempFilePath)

            if (selectedFile) {
              setFiles((prevFiles) => [...prevFiles, selectedFile])
              processed = true
              break
            }
          } else {
            window.message.info({
              key: 'file_not_supported',
              content: i18n.t('chat.input.file_not_supported')
            })
          }
          continue
        }

        // 有路径的情况
        if (supportExts.includes(getFileExtension(filePath))) {
          const selectedFile = await window.api.file.get(filePath)
          if (selectedFile) {
            setFiles((prevFiles) => [...prevFiles, selectedFile])
            processed = true
          }
        } else {
          window.message.info({
            key: 'file_not_supported',
            content: i18n.t('chat.input.file_not_supported')
          })
        }
      } catch (error) {
        Logger.error('[PasteService] Error handling paste:', error)
        window.message.error(i18n.t('chat.input.file_error'))
      }
    }

    return processed
  }

  return false
}

// 析构函数 - 用于应用关闭时清理
export const cleanup = () => {
  if (cleanupListener) {
    cleanupListener()
  }
  lastFocusedHandler = null
  defaultHandler = null
}

export default {
  registerPasteHandler,
  setActiveHandler,
  resetToDefaultHandler,
  handleFilePaste,
  cleanup
}
