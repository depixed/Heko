import { supabase } from './supabase';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type SubcategoryRow = Database['public']['Tables']['subcategories']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];

export interface ProductWithRelations extends ProductRow {
  categories?: Pick<CategoryRow, 'name'> | null;
  subcategories?: Pick<SubcategoryRow, 'name'> | null;
}

export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  tags?: string[];
}

export const catalogService = {
  async getCategories(): Promise<{ success: boolean; data?: CategoryRow[]; error?: string }> {
    try {
      console.log('[CATALOG] Fetching categories');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('[CATALOG] Error fetching categories:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Failed to fetch categories' };
      }

      console.log(`[CATALOG] Fetched ${data?.length || 0} categories`);
      return { success: true, data: data as CategoryRow[] };
    } catch (error) {
      console.error('[CATALOG] Error fetching categories:', JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch categories' };
    }
  },

  async getSubcategories(categoryId?: string): Promise<{ success: boolean; data?: SubcategoryRow[]; error?: string }> {
    try {
      console.log('[CATALOG] Fetching subcategories', categoryId ? `for category ${categoryId}` : '');
      
      let query = supabase
        .from('subcategories')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[CATALOG] Error fetching subcategories:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Failed to fetch subcategories' };
      }

      console.log(`[CATALOG] Fetched ${data?.length || 0} subcategories`);
      return { success: true, data: data as SubcategoryRow[] };
    } catch (error) {
      console.error('[CATALOG] Error fetching subcategories:', JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch subcategories' };
    }
  },

  async getProducts(filters?: ProductFilters): Promise<{ success: boolean; data?: ProductWithRelations[]; error?: string }> {
    try {
      console.log('[CATALOG] Fetching products with filters:', filters);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('active', true);

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.subcategoryId) {
        query = query.eq('subcategory_id', filters.subcategoryId);
      }

      if (filters?.inStock !== undefined) {
        query = query.eq('in_stock', filters.inStock);
      }

      if (filters?.priceMin !== undefined) {
        query = query.gte('price', filters.priceMin);
      }

      if (filters?.priceMax !== undefined) {
        query = query.lte('price', filters.priceMax);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[CATALOG] Error fetching products:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Failed to fetch products' };
      }

      console.log(`[CATALOG] Fetched ${data?.length || 0} products`);
      return { success: true, data: data as ProductWithRelations[] };
    } catch (error) {
      console.error('[CATALOG] Error fetching products:', JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch products' };
    }
  },

  async getProductById(id: string): Promise<{ success: boolean; data?: ProductWithRelations; error?: string }> {
    try {
      console.log('[CATALOG] Fetching product:', id);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('[CATALOG] Error fetching product:', error ? JSON.stringify(error, null, 2) : 'No data');
        return { success: false, error: error?.message || 'Product not found' };
      }

      const product = data as ProductWithRelations;
      console.log('[CATALOG] Fetched product:', product.name);
      return { success: true, data: data as ProductWithRelations };
    } catch (error) {
      console.error('[CATALOG] Error fetching product:', JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch product' };
    }
  },

  async searchProducts(query: string): Promise<{ success: boolean; data?: ProductWithRelations[]; error?: string }> {
    try {
      console.log('[CATALOG] Searching products:', query);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('active', true)
        .or(`name.ilike.%${query}%,tags.cs.{${query}}`)
        .order('name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[CATALOG] Error searching products:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Failed to search products' };
      }

      console.log(`[CATALOG] Found ${data?.length || 0} products matching "${query}"`);
      return { success: true, data: data as ProductWithRelations[] };
    } catch (error) {
      console.error('[CATALOG] Error searching products:', JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : 'Failed to search products' };
    }
  },
};
