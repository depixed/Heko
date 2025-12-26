import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogService, ProductWithRelations } from '@/lib/catalog.service';
import { supabase } from '@/lib/supabase';
import type { Product, Category, Subcategory } from '@/types';
import { useVendorAssignment } from './VendorAssignmentContext';

export const [ProductProvider, useProducts] = createContextHook(() => {
  const { mode, activeVendorId, hasEligibleVendor } = useVendorAssignment();
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
          const subcategories: Subcategory[] = subsResult.success && subsResult.data 
            ? subsResult.data.map(sub => ({
                id: sub.id,
                name: sub.name,
                image: sub.image || 'https://via.placeholder.com/150',
              }))
            : [];
          
          appCategories.push({
            id: cat.id,
            name: cat.name,
            image: cat.image || 'https://via.placeholder.com/150',
            subcategories,
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
      
      // In single mode without eligible vendor, don't load products
      if (mode === 'single' && !hasEligibleVendor) {
        console.log('[ProductContext] No eligible vendor - hiding products');
        setProducts([]);
        return;
      }

      console.log('[ProductContext] Loading products', mode === 'single' ? `for vendor: ${activeVendorId}` : '');
      const result = await catalogService.getProducts();
      if (result.success && result.data) {
        let filteredProducts = result.data;

        // In single mode, filter by active vendor's products
        if (mode === 'single' && activeVendorId) {
          console.log('[ProductContext] Filtering products for vendor:', activeVendorId);
          // Fetch vendor_products for active vendor
          const { data: vendorProducts, error: vendorProductsError } = await supabase
            .from('vendor_products')
            .select('product_id')
            .eq('vendor_id', activeVendorId)
            .eq('is_available', true);

          if (vendorProductsError) {
            console.error('[ProductContext] Error fetching vendor products:', vendorProductsError);
          } else {
            const availableProductIds = new Set(
              vendorProducts?.map(vp => vp.product_id) || []
            );

            filteredProducts = filteredProducts.filter(p =>
              availableProductIds.has(p.id)
            );
            console.log(`[ProductContext] Filtered to ${filteredProducts.length} products for vendor`);
          }
        }

        const appProducts: Product[] = filteredProducts.map((prod: ProductWithRelations) => {
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
      // In single mode without eligible vendor, return empty results
      if (mode === 'single' && !hasEligibleVendor) {
        return [];
      }

      console.log('[ProductContext] Searching products:', query);
      const result = await catalogService.searchProducts(query);
      if (result.success && result.data) {
        let filteredResults = result.data;

        // In single mode, filter by active vendor's products
        if (mode === 'single' && activeVendorId) {
          const { data: vendorProducts } = await supabase
            .from('vendor_products')
            .select('product_id')
            .eq('vendor_id', activeVendorId)
            .eq('is_available', true);

          if (vendorProducts) {
            const availableProductIds = new Set(
              vendorProducts.map(vp => vp.product_id)
            );
            filteredResults = filteredResults.filter(p =>
              availableProductIds.has(p.id)
            );
          }
        }

        const searchResults: Product[] = filteredResults.map((prod: ProductWithRelations) => {
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
  }, [mode, activeVendorId, hasEligibleVendor]);

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, []);

  const refreshCategories = useCallback(async () => {
    await loadCategories();
  }, []);

  // Reload products when active vendor changes (single mode) or mode changes
  useEffect(() => {
    if (mode === 'single') {
      loadProducts();
    } else if (mode === 'multi') {
      // Reload all products when switching to multi-vendor mode
      loadProducts();
    }
  }, [activeVendorId, hasEligibleVendor, mode]);

  // Real-time subscription for product updates
  useEffect(() => {
    const channel = supabase
      .channel('products-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        () => {
          console.log('[ProductContext] Product update detected, refreshing products...');
          refreshProducts();
        }
      )
      .subscribe();

    return () => {
      console.log('[ProductContext] Unsubscribing from product updates');
      supabase.removeChannel(channel);
    };
  }, [refreshProducts]);

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
