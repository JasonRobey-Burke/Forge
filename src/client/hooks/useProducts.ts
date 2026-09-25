import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchSourced, apiFetchSourcedList } from '@/lib/api';
import type { Product, UpdateProductInput } from '@shared/types';

export const productKeys = {
  all: ['products'] as const,
  detail: (id: string) => ['products', id] as const,
};

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: () => apiFetchSourcedList<Product>('/products'),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiFetchSourced<Product>(`/products/${id}`),
    enabled: id !== '',
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, ...input }: UpdateProductInput & { id: string; revision: string }) =>
      apiFetchSourced<Product>(`/products/${id}`, { method: 'PUT', headers: {'If-Match':revision}, body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(vars.id) });
    },
  });
}
