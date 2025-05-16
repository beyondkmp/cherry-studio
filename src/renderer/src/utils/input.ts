import Logger from '@renderer/config/logger'
import { FileType } from '@renderer/types'

export const getFilesFromDropEvent = async (e: React.DragEvent<HTMLDivElement>): Promise<FileType[]> => {
  if (e.dataTransfer.files.length > 0) {
    Logger.log('Processing dropped files:', e.dataTransfer.files)

    // 检查文件路径
    const files = [...e.dataTransfer.files]
    for (const file of files) {
      Logger.log('Dropped file:', file.name, 'Path:', file.path, 'Type:', file.type)
    }

    // 在Windows系统中，有时候file.path可能是空的，这种情况下我们需要通过其他方式处理文件
    if (files.some((file) => !file.path)) {
      Logger.log('Some files have no path, using blob/buffer approach')

      const list: FileType[] = []

      for (const file of files) {
        try {
          // 如果文件没有路径，我们需要创建一个临时文件
          if (!file.path) {
            const buffer = await file.arrayBuffer()
            // 使用安全的文件名创建临时文件
            const safeFileName = encodeURIComponent(file.name).replace(/%/g, '_')
            const tempFilePath = await window.api.file.create(safeFileName)
            await window.api.file.write(tempFilePath, new Uint8Array(buffer))
            const fileInfo = await window.api.file.get(tempFilePath)

            if (fileInfo) {
              // 保留原始文件名，确保中文正确显示
              fileInfo.origin_name = file.name
              fileInfo.name = file.name
              // 添加原始名称的元数据
              if (!fileInfo.metadata) fileInfo.metadata = {}
              fileInfo.metadata.originalName = file.name
              Logger.log('Successfully created temp file with original name:', file.name)
              list.push(fileInfo)
            }
          } else {
            // 正常处理有路径的文件
            const fileInfo = await window.api.file.get(file.path)
            if (fileInfo) {
              list.push(fileInfo)
            }
          }
        } catch (error) {
          Logger.error('Error processing file:', file.name, error)
        }
      }

      Logger.log('Processed files with blob/buffer approach:', list.length)
      return list
    }

    // 原始的处理方法 - 对于有文件路径的情况
    const results = await Promise.allSettled(files.map((file) => window.api.file.get(file.path)))
    const list: FileType[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value !== null) {
          list.push(result.value)
          Logger.log('Successfully processed file:', result.value.name)
        } else {
          Logger.log('File processing returned null')
        }
      } else {
        Logger.error('[src/renderer/src/utils/input.ts] getFilesFromDropEvent:', result.reason)
      }
    }

    Logger.log('Total processed files:', list.length)
    return list
  } else {
    // 处理其他类型的拖放数据
    Logger.log('No files in dataTransfer, checking items')

    return new Promise((resolve) => {
      let existCodefilesFormat = false

      for (const item of e.dataTransfer.items) {
        const { type } = item
        Logger.log('DataTransfer item type:', type)

        if (type === 'codefiles') {
          item.getAsString(async (filePathListString) => {
            try {
              const filePathList: string[] = JSON.parse(filePathListString)
              Logger.log('Found codefiles paths:', filePathList)

              const filePathListPromises = filePathList.map((filePath) => window.api.file.get(filePath))
              resolve(
                await Promise.allSettled(filePathListPromises).then((results) =>
                  results
                    .filter((result) => result.status === 'fulfilled')
                    .filter((result) => result.value !== null)
                    .map((result) => result.value!)
                )
              )
            } catch (error) {
              Logger.error('Error processing codefiles:', error)
              resolve([])
            }
          })

          existCodefilesFormat = true
          break
        }

        // 检查是否是普通文件
        if (item.kind === 'file') {
          try {
            const file = item.getAsFile()
            Logger.log('Found file item:', file?.name)

            if (file) {
              // 类似于前面的处理
              ;(async () => {
                try {
                  const buffer = await file.arrayBuffer()
                  // 使用安全的文件名创建临时文件
                  const safeFileName = encodeURIComponent(file.name).replace(/%/g, '_')
                  const tempFilePath = await window.api.file.create(safeFileName)
                  await window.api.file.write(tempFilePath, new Uint8Array(buffer))
                  const fileInfo = await window.api.file.get(tempFilePath)

                  if (fileInfo) {
                    // 保留原始文件名，确保中文正确显示
                    fileInfo.origin_name = file.name
                    fileInfo.name = file.name
                    // 添加原始名称的元数据
                    if (!fileInfo.metadata) fileInfo.metadata = {}
                    fileInfo.metadata.originalName = file.name
                    Logger.log('Successfully created temp file for item with original name:', file.name)
                    resolve([fileInfo])
                    return
                  }
                } catch (error) {
                  Logger.error('Error processing file item:', file.name, error)
                }
                resolve([])
              })()

              existCodefilesFormat = true
              break
            }
          } catch (error) {
            Logger.error('Error processing file item:', error)
          }
        }
      }

      if (!existCodefilesFormat) {
        Logger.log('No compatible items found in drag event')
        resolve([])
      }
    })
  }
}
