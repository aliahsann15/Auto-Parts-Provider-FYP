import { apiRequest } from './client';

export type CarModel = {
  modelName: string;
  year: number;
  variants?: string[];
};

export async function fetchCarMakes(search?: string, token?: string | null) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<{ ok: boolean; makes: string[] }>(`/car-data/makes${qs}`, {
    method: 'GET',
    ...(token ? { token } : {})
  });
}

export async function fetchCarModels(make: string, year?: number | string, token?: string | null) {
  const params = new URLSearchParams({ make });
  if (year !== undefined && year !== null && String(year).trim()) {
    params.append('year', String(year));
  }
  return apiRequest<{ ok: boolean; models: CarModel[] }>(`/car-data/models?${params.toString()}`, {
    method: 'GET',
    ...(token ? { token } : {})
  });
}
