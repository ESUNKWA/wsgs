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

    successPaginated(message: string, result: { items: any[]; total: number; page: number; limit: number; totalPages: number }) {
        return {
          status: 'success',
          message,
          data: result.items,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          },
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
