import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import Colors from '@/constants/colors';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, CartItem } from '@/types';

export default function SubcategoryScreen() {
  const router = useRouter();
  const { categoryId, subcategory } = useLocalSearchParams();
  const { cart, addToCart, updateCartItem } = useAuth();
  const { categories, getProductsBySubcategory } = useProducts();
  const { width: screenWidth } = useWindowDimensions();
  
  const decodedSubcategory = decodeURIComponent(subcategory as string);
  const category = categories.find(c => c.id === categoryId);

  const products = useMemo(() => {
    if (!category || !categoryId) return [];
    return getProductsBySubcategory(categoryId as string, decodedSubcategory);
  }, [category, categoryId, decodedSubcategory, getProductsBySubcategory]);

  const getCartQuantity = (productId: string) => {
    const item = cart.find((i: CartItem) => i.product.id === productId);
    return item?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    addToCart({ product, quantity: 1 });
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    const quantity = getCartQuantity(item.id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product/${item.id}` as any)}
      >
        <Image 
          source={{ uri: item.image }} 
          style={[styles.productImage, { 
            height: Math.max(120, Math.min(200, ((screenWidth - 48) / 2) * 0.85))
          }]} 
          resizeMode="contain"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          {item.unit && item.unit.trim() && <Text style={styles.productUnit}>{item.unit}</Text>}
          <View style={styles.productPricing}>
            <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
            {item.discount > 0 && (
              <>
                <Text style={styles.productMrp}>₹{item.mrp.toFixed(2)}</Text>
                <Text style={styles.productDiscount}>{item.discount}% OFF</Text>
              </>
            )}
          </View>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
            >
              <Text style={styles.addButtonText}>Add to cart</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyStepper}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={(e) => {
                  e.stopPropagation();
                  updateCartItem(item.id, quantity - 1);
                }}
              >
                <Minus size={14} color={Colors.text.inverse} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={(e) => {
                  e.stopPropagation();
                  updateCartItem(item.id, quantity + 1);
                }}
              >
                <Plus size={14} color={Colors.text.inverse} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!category) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found', headerShown: true }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Category not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: decodedSubcategory,
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.background.primary,
          },
          headerTintColor: Colors.text.primary,
          headerShadowVisible: false,
        }} 
      />

      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productGrid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No products in this subcategory</Text>
            <Text style={styles.emptySubtext}>Check back later for new items</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  productGrid: {
    padding: 16,
  },
  productRow: {
    gap: 12,
    marginBottom: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    backgroundColor: Colors.background.secondary,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  productPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  productMrp: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  productDiscount: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.status.success,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  qtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});
