import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogService, ProductWithRelations } from '@/lib/catalog.service';
import type { Product, Category } from '@/types';

export const [ProductProvider, useProducts] = createContextHook(() => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('[ProductContext] Loading categories');
      const result = await catalogService.getCategories();
      if (result.success && result.data) {
        const appCategories: Category[] = [];
        
        for (const cat of result.data) {
          const subsResult = await catalogService.getSubcategories(cat.id);
          const subcategoryNames = subsResult.success && subsResult.data 
            ? subsResult.data.map(sub => sub.name)
            : [];
          
          appCategories.push({
            id: cat.id,
            name: cat.name,
            image: cat.image || 'https://via.placeholder.com/150',
            subcategories: subcategoryNames,
          });
        }
        
        setCategories(appCategories);
        console.log('[ProductContext] Categories loaded:', appCategories.length);
      }
    } catch (error) {
      console.error('[ProductContext] Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      console.log('[ProductContext] Loading products');
      const result = await catalogService.getProducts();
      if (result.success && result.data) {
        const appProducts: Product[] = result.data.map((prod: ProductWithRelations) => {
          // Handle images array from database
          const imageArray = Array.isArray(prod.images) && prod.images.length > 0 
            ? prod.images 
            : ['https://via.placeholder.com/300'];
          
          return {
            id: prod.id,
            name: prod.name,
            description: prod.description || '',
            image: imageArray[0], // Use first image as primary
            images: imageArray,
            price: prod.price,
            mrp: prod.mrp,
            discount: prod.discount,
            unit: prod.unit || 'unit',
            category: prod.categories?.name || '',
            subcategory: prod.subcategories?.name || '',
            inStock: prod.in_stock,
            tags: prod.tags || [],
          };
        });
        setProducts(appProducts);
        console.log('[ProductContext] Products loaded:', appProducts.length);
      }
    } catch (error) {
      console.error('[ProductContext] Error loading products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  const getProductsByCategory = useCallback((categoryId: string): Product[] => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    return products.filter(p => p.category === category.name);
  }, [products, categories]);

  const getProductsBySubcategory = useCallback((categoryId: string, subcategoryName: string): Product[] => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    return products.filter(p => p.category === category.name && p.subcategory === subcategoryName);
  }, [products, categories]);

  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    try {
      console.log('[ProductContext] Searching products:', query);
      const result = await catalogService.searchProducts(query);
      if (result.success && result.data) {
        const searchResults: Product[] = result.data.map((prod: ProductWithRelations) => {
          // Handle images array from database
          const imageArray = Array.isArray(prod.images) && prod.images.length > 0 
            ? prod.images 
            : ['https://via.placeholder.com/300'];
          
          return {
            id: prod.id,
            name: prod.name,
            description: prod.description || '',
            image: imageArray[0], // Use first image as primary
            images: imageArray,
            price: prod.price,
            mrp: prod.mrp,
            discount: prod.discount,
            unit: prod.unit || 'unit',
            category: prod.categories?.name || '',
            subcategory: prod.subcategories?.name || '',
            inStock: prod.in_stock,
            tags: prod.tags || [],
          };
        });
        return searchResults;
      }
      return [];
    } catch (error) {
      console.error('[ProductContext] Error searching products:', error);
      return [];
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, []);

  const refreshCategories = useCallback(async () => {
    await loadCategories();
  }, []);

  return useMemo(() => ({
    categories,
    products,
    isLoadingCategories,
    isLoadingProducts,
    getProductById,
    getProductsByCategory,
    getProductsBySubcategory,
    searchProducts,
    refreshProducts,
    refreshCategories,
  }), [
    categories,
    products,
    isLoadingCategories,
    isLoadingProducts,
    getProductById,
    getProductsByCategory,
    getProductsBySubcategory,
    searchProducts,
    refreshProducts,
    refreshCategories,
  ]);
});
