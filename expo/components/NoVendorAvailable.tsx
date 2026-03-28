import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAddresses } from '@/contexts/AddressContext';

export function NoVendorAvailable() {
  const router = useRouter();
  const { addresses } = useAddresses();

  const handleChangeAddress = () => {
    router.push('/addresses');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>We're not serving this area yet</Text>
      <Text style={styles.message}>
        Please try a nearby location or check again soon
      </Text>
      {addresses.length > 0 && (
        <TouchableOpacity style={styles.button} onPress={handleChangeAddress}>
          <Text style={styles.buttonText}>Change Delivery Address</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.hint}>
        You can still manage your saved addresses
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
