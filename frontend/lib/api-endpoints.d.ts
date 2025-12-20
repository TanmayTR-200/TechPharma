export interface ApiEndpoints {
  auth: {
    login: string;
    register: string;
    verifyEmail: string;
    forgotPassword: string;
    resetPassword: string;
    me: string;
  };
  products: {
    base: string;
    list: string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
    sold: {
      list: string;
      archiveSale: (id: string) => string;
    };
  };
  cart: {
    list: string;
    add: string;
    remove: (id: string) => string;
    update: (id: string) => string;
    clear: string;
  };
  orders: {
    base: string;
    list: string;
    create: string;
    update: (id: string) => string;
  };
}

export const API_BASE_URL: string;
export const API_ENDPOINTS: ApiEndpoints;

// Revert to the original export
export type { ApiEndpoints };