import { Worker } from 'worker_threads';
import * as path from 'path';

export class PerformanceService {
  private diffWorker: Worker | null = null;
  private workerQueue: Array<{
    id: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private nextId = 0;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      this.diffWorker = new Worker(path.join(__dirname, 'workers/DiffWorker.js'));
      
      this.diffWorker.on('message', (result: any) => {
        this.handleWorkerMessage(result);
      });

      this.diffWorker.on('error', (error) => {
        console.error('Diff worker error:', error);
        this.rejectAllPending('Worker error: ' + error.message);
      });

      this.diffWorker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Diff worker stopped with exit code ${code}`);
          this.rejectAllPending('Worker stopped unexpectedly');
        }
      });
    } catch (error) {
      console.error('Failed to initialize diff worker:', error);
    }
  }

  private handleWorkerMessage(result: any) {
    const { id, type, payload, error } = result;
    
    if (error) {
      this.rejectPending(id, new Error(error));
      return;
    }

    const pending = this.workerQueue.find(item => item.id === id);
    if (pending) {
      pending.resolve({ type, payload });
      this.workerQueue = this.workerQueue.filter(item => item.id !== id);
    }
  }

  private rejectAllPending(reason: string) {
    this.workerQueue.forEach(item => {
      item.reject(new Error(reason));
    });
    this.workerQueue = [];
  }

  private rejectPending(id: string, error: Error) {
    const pending = this.workerQueue.find(item => item.id === id);
    if (pending) {
      pending.reject(error);
      this.workerQueue = this.workerQueue.filter(item => item.id !== id);
    }
  }

  public async computeDiff(base: string, head: string, filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = (this.nextId++).toString();
      
      this.workerQueue.push({ id, resolve, reject });
      
      if (this.diffWorker) {
        this.diffWorker.postMessage({
          id,
          type: 'compute_diff',
          payload: { base, head, filename }
        });
      } else {
        reject(new Error('Diff worker not available'));
      }
    });
  }

  public async tokenizeCode(code: string, language: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = (this.nextId++).toString();
      
      this.workerQueue.push({ id, resolve, reject });
      
      if (this.diffWorker) {
        this.diffWorker.postMessage({
          id,
          type: 'tokenize',
          payload: { code, language }
        });
      } else {
        reject(new Error('Diff worker not available'));
      }
    });
  }

  public cleanup() {
    if (this.diffWorker) {
      this.diffWorker.terminate();
      this.diffWorker = null;
    }
    this.rejectAllPending('Service cleanup');
  }
}