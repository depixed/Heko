import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useProducts } from '@/contexts/ProductContext';
import TopNav from '@/components/TopNav';


export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, isLoadingCategories } = useProducts();

  return (
    <View style={styles.container}>
      <TopNav showBackButton={false} title="Categories" />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.grid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => router.push(`/category/${category.id}` as any)}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.subcategoriesCount}>
                  {category.subcategories.length} subcategories
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  grid: {
    padding: 16,
    gap: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  categoryImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.background.primary,
  },
  categoryInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subcategoriesCount: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});
