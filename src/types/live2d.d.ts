declare module 'pixi-live2d-display/cubism4' {
  import { Container, ObservablePoint } from 'pixi.js';

  export class Live2DModel extends Container {
    static from(source: string | object, options?: any): Promise<Live2DModel>;
    motion(group: string, index?: number, priority?: number): void;
    expression(name?: string | number): void;
    focus(x: number, y: number, instant?: boolean): void;
    tap(x: number, y: number): void;

    anchor: ObservablePoint;
    scale: ObservablePoint;
    internalModel: {
      motionManager: any;
      focusController: any;
    };
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  keys(): AsyncIterableIterator<string>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface StorageManager {
  getDirectory(): Promise<FileSystemDirectoryHandle>;
}
