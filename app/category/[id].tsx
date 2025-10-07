import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MOCK_CATEGORIES } from '@/mocks/data';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const category = MOCK_CATEGORIES.find(c => c.id === id);

  if (!category) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Category Not Found', headerShown: true }} />
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
          title: category.name,
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.background.primary,
          },
          headerTintColor: Colors.text.primary,
          headerShadowVisible: false,
        }} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={{ uri: category.image }} style={styles.categoryImage} />
          <View style={styles.headerOverlay}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            <Text style={styles.subcategoryCount}>
              {category.subcategories.length} subcategories
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Subcategory</Text>
          <View style={styles.subcategoriesGrid}>
            {category.subcategories.map((subcategory, index) => (
              <TouchableOpacity
                key={index}
                style={styles.subcategoryCard}
                onPress={() => router.push(`/subcategory/${id}/${encodeURIComponent(subcategory)}` as any)}
              >
                <View style={styles.subcategoryContent}>
                  <Text style={styles.subcategoryName}>{subcategory}</Text>
                  <ChevronRight size={20} color={Colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    height: 200,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    marginBottom: 4,
  },
  subcategoryCount: {
    fontSize: 14,
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  subcategoriesGrid: {
    gap: 12,
  },
  subcategoryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.tertiary,
  },
});
