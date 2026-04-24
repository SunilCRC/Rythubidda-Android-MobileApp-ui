import { apiDelete, apiGet, apiPost, apiPut } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { CustomerAddress } from '../../types';

export const addressService = {
  list: () => apiGet<CustomerAddress[]>(ENDPOINTS.ADDRESSES),

  save: (address: CustomerAddress) =>
    apiPost<CustomerAddress>(ENDPOINTS.ADDRESS_SAVE, address),

  update: (address: CustomerAddress) =>
    apiPut<CustomerAddress>(ENDPOINTS.ADDRESS_UPDATE, address),

  remove: (customerAddressId: number) =>
    apiDelete<void>(ENDPOINTS.ADDRESS_DELETE(customerAddressId)),
};
