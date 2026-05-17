export enum ModelFormat {
  Live2DDirectory = 'live2d-directory',
  Live2DZip = 'live2d-zip',
}

export interface DisplayModelBase {
  id: string
  format: ModelFormat
  name: string
  previewImage?: string
  importedAt: number
}

export interface DisplayModelURL extends DisplayModelBase {
  type: 'url'
  url: string
}

export interface DisplayModelFile extends DisplayModelBase {
  type: 'file'
  fileData: ArrayBuffer
  fileName: string
}

export type DisplayModel = DisplayModelURL | DisplayModelFile

export interface ModelValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  entryPoint?: string
}
