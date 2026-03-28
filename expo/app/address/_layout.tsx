import { Stack } from 'expo-router';

export default function AddressLayout() {
  return (
    <Stack>
      <Stack.Screen name="add" options={{ title: 'Add Address' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit Address' }} />
    </Stack>
  );
}
