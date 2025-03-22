import { Injectable } from '@nestjs/common';

@Injectable()
export class ResponseService {
    success(message: string, data: any) {
        return {
          status: 'success',
          message,
          data,
        };
      }
    
      error(message: string, error?: any) {
        return {
          status: 'error',
          message,
          error: error ? error.toString() : null,
        };
      }
}
