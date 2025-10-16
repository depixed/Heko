# Supabase Row Level Security (RLS) Policies

## ⚠️ Critical Issue
The current error `new row violates row-level security policy for table "profiles"` occurs because:
1. We're using phone-based authentication without Supabase Auth JWT
2. The RLS policies on the `profiles` table require authentication
3. During signup, we don't have an authenticated session yet

## 🔧 Solution Options

### Option 1: Temporary RLS Disable (Development Only)
For development and testing, you can temporarily disable RLS on the profiles table:

```sql
-- In Supabase SQL Editor
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING**: This is NOT secure for production. Only use during development.

---

### Option 2: Permissive Insert Policy (Recommended for Phone Auth)
Allow anyone to insert a new profile, but only the profile owner can update/delete:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to insert (for signup)
CREATE POLICY "Allow public insert for signup" 
ON profiles 
FOR INSERT 
TO public
WITH CHECK (true);

-- Policy 2: Allow users to read their own profile
CREATE POLICY "Users can read own profile" 
ON profiles 
FOR SELECT 
TO public
USING (id::text = current_setting('app.user_id', true));

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
TO public
USING (id::text = current_setting('app.user_id', true))
WITH CHECK (id::text = current_setting('app.user_id', true));

-- Policy 4: Prevent users from deleting profiles
CREATE POLICY "Prevent profile deletion" 
ON profiles 
FOR DELETE 
TO public
USING (false);
```

**For user_roles table:**
```sql
-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert user roles (needed during signup)
CREATE POLICY "Allow public insert for user roles" 
ON user_roles 
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow users to read their own roles
CREATE POLICY "Users can read own roles" 
ON user_roles 
FOR SELECT 
TO public
USING (user_id::text = current_setting('app.user_id', true));
```

---

### Option 3: Use Supabase Auth (Best for Production)
Integrate proper Supabase Auth with phone authentication:

1. Enable Phone Auth in Supabase Dashboard → Authentication → Providers
2. Update the auth service to use Supabase Auth:

```typescript
// lib/auth.service.ts
async signUp(data: { phone: string; name: string; email?: string }) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    phone: data.phone,
    password: 'temp-password', // Or use passwordless
  });

  if (authError || !authData.user) {
    return { success: false, error: authError.message };
  }

  // 2. Create profile (with RLS that checks auth.uid())
  const referralCode = `HEKO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id, // Use auth user ID
      name: data.name,
      phone: data.phone,
      email: data.email,
      referral_code: referralCode,
    });

  return { success: !profileError };
}
```

With RLS policies using `auth.uid()`:
```sql
-- Policy for authenticated users
CREATE POLICY "Users can read own profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);
```

---

## 🚀 Quick Fix for Current Setup

Since you're using custom phone auth without Supabase Auth, the **quickest solution** is:

1. Go to Supabase Dashboard
2. Navigate to: **Database → Tables → profiles**
3. Click on **RLS** tab
4. Click **"Disable RLS"** temporarily

OR run this SQL in Supabase SQL Editor:

```sql
-- Disable RLS for development
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE return_items DISABLE ROW LEVEL SECURITY;

-- Keep products/categories readable by everyone
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON categories FOR SELECT TO public USING (true);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON subcategories FOR SELECT TO public USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON products FOR SELECT TO public USING (true);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON banners FOR SELECT TO public USING (true);
```

---

## 📝 Recommended Action

For your current setup (custom phone auth), **Option 1** (disable RLS) or **Option 2** (permissive insert policy) is the fastest path forward.

For production, migrate to **Option 3** (Supabase Auth with phone provider) for proper security.

---

## Next Steps After Fixing RLS

1. Run the SQL commands above in Supabase SQL Editor
2. Retry the signup flow in your app
3. Verify that user profile and user_roles are created successfully
4. Test login flow with the newly created user
