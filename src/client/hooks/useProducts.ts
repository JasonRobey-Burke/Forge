import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Product, CreateProductInput, UpdateProductInput } from '@shared/types';

export const productKeys = {
  all: ['products'] as const,
  detail: (id: string) => ['products', id] as const,
};

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: () => apiFetch<Product[]>('/products'),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiFetch<Product>(`/products/${id}`),
    enabled: id !== '',
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProductInput & { id: string }) =>
      apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(vars.id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ archived: true }>(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
