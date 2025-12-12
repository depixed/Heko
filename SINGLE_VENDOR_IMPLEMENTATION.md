# Single-Vendor Mode Implementation Guide

## Overview
This document describes the implementation of Phase 1 single-vendor mode with service radius logic. The feature allows automatic vendor assignment based on geographic proximity while maintaining compatibility with the existing multi-vendor system through a feature flag.

## Feature Flag
- **Setting Key**: `vendor_assignment_mode`
- **Values**: `"single"` | `"multi"`
- **Location**: `system_settings` table
- **Default**: `"single"` (for Phase 1)

## Implementation Components

### 1. Database Migrations

Run these migrations in order in Supabase SQL Editor:

1. **`migrations/add_vendor_location_fields.sql`**
   - Adds `latitude`, `longitude`, `service_radius`, `status`, and `user_id` columns to `vendors` table
   - Creates indexes for location-based queries

2. **`migrations/add_vendor_assignment_mode_setting.sql`**
   - Adds `vendor_assignment_mode` system setting
   - Adds `service_radius` system setting (default fallback)

3. **`migrations/add_delivery_vendor_fields.sql`**
   - Adds `vendor_id`, `pickup_address`, `delivery_address`, and `otp` to `deliveries` table

### 2. Core Services & Utilities

#### `utils/geolocation.ts`
- **`calculateHaversineDistance()`**: Calculates distance between two coordinates
- **`findNearestVendor()`**: Finds the nearest eligible vendor for an address
- **`isVendorEligible()`**: Checks if a vendor can serve an address

#### `lib/vendor.service.ts`
- **`getActiveVendorsWithLocation()`**: Fetches all active vendors with location data
- **`getVendorById()`**: Fetches a single vendor by ID

### 3. Contexts

#### `contexts/VendorAssignmentContext.tsx`
Manages vendor assignment state:
- Loads `vendor_assignment_mode` from system settings
- Computes active vendor based on selected address
- Provides `activeVendorId`, `activeVendorName`, `hasEligibleVendor` to other contexts
- Handles address changes and vendor recalculation

#### Updated `contexts/ProductContext.tsx`
- Filters products by active vendor in single mode
- Hides all products when no eligible vendor exists
- Updates search results to respect vendor filtering

#### Updated `contexts/CartContext.tsx`
- Clears cart when active vendor changes in single mode
- Prevents cart items from different vendors

### 4. UI Components

#### `components/NoVendorAvailable.tsx`
Displays when no vendor can serve the selected address:
- Friendly message explaining the situation
- Button to change delivery address
- Allows address management

#### Updated `app/(tabs)/index.tsx`
- Shows `NoVendorAvailable` component when `mode === 'single' && !hasEligibleVendor`
- Hides product catalog when no vendor available

### 5. Edge Function

#### `supabase/functions/auto-assign-order/index.ts`
Automatically assigns orders to nearest vendor:
- Checks `vendor_assignment_mode` setting
- Calculates distances using Haversine formula
- Filters vendors by service radius
- Assigns all order items to nearest vendor
- Creates delivery record
- Updates order status to `processing`
- Sends notifications to vendor and admin

### 6. Order Service Integration

#### Updated `lib/order.service.ts`
- After order creation, checks `vendor_assignment_mode`
- If `single`, calls `auto-assign-order` edge function
- Handles errors gracefully (order remains in `placed` status if assignment fails)

### 7. App Layout

#### Updated `app/_layout.tsx`
- Added `VendorAssignmentProvider` in the context hierarchy
- Positioned after `AddressProvider` and before `ProductProvider`

## Google APIs Required

### 1. **Google Geocoding API** (Required)
**Purpose**: Convert addresses to latitude/longitude coordinates

**When to Use**:
- When vendors add/update their business address
- When customers add/update delivery addresses
- When addresses are imported from external sources

**API Endpoint**: `https://maps.googleapis.com/maps/api/geocoding/json`

**Required Parameters**:
- `address`: The address string to geocode
- `key`: Your Google API key

**Example Usage**:
```typescript
const response = await fetch(
  `https://maps.googleapis.com/maps/api/geocoding/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
);
const data = await response.json();
const { lat, lng } = data.results[0].geometry.location;
```

**Setup Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Geocoding API"
4. Create API credentials (API Key)
5. Restrict API key to Geocoding API only (for security)
6. Add API key to your environment variables

**Cost**: 
- First $200/month free (40,000 requests)
- $5 per 1,000 requests after that

### 2. **Google Places API** (Optional but Recommended)
**Purpose**: Autocomplete address input and validate addresses

**When to Use**:
- Address autocomplete in vendor registration form
- Address autocomplete in customer address form
- Address validation before saving

**API Endpoints**:
- `https://maps.googleapis.com/maps/api/place/autocomplete/json` - Autocomplete
- `https://maps.googleapis.com/maps/api/place/details/json` - Get place details with coordinates

**Setup Steps**:
1. Enable "Places API" in Google Cloud Console
2. Use same API key or create separate key
3. Add to environment variables

**Cost**:
- Autocomplete: $2.83 per 1,000 requests
- Place Details: $17 per 1,000 requests

### 3. **Google Maps JavaScript API** (Optional - for Admin Panel)
**Purpose**: Display vendor locations on a map in admin panel

**When to Use**:
- Admin panel to visualize vendor coverage areas
- Admin panel to see all vendor locations
- Service radius visualization

**Setup Steps**:
1. Enable "Maps JavaScript API" in Google Cloud Console
2. Use same API key or create separate key

**Cost**: $7 per 1,000 map loads

## Implementation Flow

### Single Mode Flow:

1. **App Launch**
   - `VendorAssignmentContext` loads `vendor_assignment_mode` from settings
   - If `single`, computes nearest vendor for default address
   - Sets `activeVendorId` and `hasEligibleVendor`

2. **Product Display**
   - `ProductContext` filters products by `activeVendorId` (via `vendor_products` table)
   - If `!hasEligibleVendor`, shows `NoVendorAvailable` component

3. **Address Change**
   - User changes selected address
   - `VendorAssignmentContext` recalculates nearest vendor
   - If vendor changes, `CartContext` clears cart
   - `ProductContext` reloads products for new vendor

4. **Order Placement**
   - Order created with status `placed`
   - `order.service.ts` calls `auto-assign-order` edge function
   - Edge function assigns vendor and updates order status to `processing`
   - Delivery record created

### Multi Mode Flow:

- Everything works as before
- No vendor filtering
- No auto-assignment
- Existing bidding/pending pool logic continues

## Database Schema Updates

### Vendors Table
```sql
ALTER TABLE vendors ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE vendors ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE vendors ADD COLUMN service_radius DECIMAL(6, 2) DEFAULT 5.0;
ALTER TABLE vendors ADD COLUMN status VARCHAR DEFAULT 'active';
ALTER TABLE vendors ADD COLUMN user_id UUID;
```

### Deliveries Table
```sql
ALTER TABLE deliveries ADD COLUMN vendor_id UUID REFERENCES vendors(id);
ALTER TABLE deliveries ADD COLUMN pickup_address TEXT;
ALTER TABLE deliveries ADD COLUMN delivery_address TEXT;
ALTER TABLE deliveries ADD COLUMN otp VARCHAR(6);
```

### System Settings
```sql
INSERT INTO system_settings (key, value) VALUES 
  ('vendor_assignment_mode', '"single"'::jsonb),
  ('service_radius', '5'::jsonb);
```

## Testing Checklist

- [ ] Run all database migrations
- [ ] Deploy `auto-assign-order` edge function
- [ ] Set `vendor_assignment_mode` to `"single"` in system_settings
- [ ] Add latitude/longitude to at least one vendor
- [ ] Add latitude/longitude to customer addresses
- [ ] Test: Customer with address within vendor radius sees products
- [ ] Test: Customer with address outside vendor radius sees "Not serving" message
- [ ] Test: Changing address recalculates vendor
- [ ] Test: Cart clears when vendor changes
- [ ] Test: Order placement triggers auto-assignment
- [ ] Test: Switch to `"multi"` mode - existing behavior works
- [ ] Test: Edge function handles missing coordinates gracefully
- [ ] Test: Edge function handles no eligible vendors gracefully

## Environment Variables

Add to your `.env` file:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Next Steps

1. **Set up Google Geocoding API** (Required)
   - Get API key from Google Cloud Console
   - Add to environment variables
   - Create utility function to geocode addresses

2. **Update Vendor Registration Form**
   - Add latitude/longitude fields (or geocode from address)
   - Add service_radius input field
   - Validate coordinates before saving

3. **Update Address Forms**
   - Add geocoding when address is entered
   - Store lat/lng with address
   - Validate coordinates exist before allowing checkout

4. **Admin Panel Updates**
   - Add toggle for `vendor_assignment_mode`
   - Display vendor locations on map
   - Show service radius visualization
   - Allow editing vendor coordinates and service radius

## Notes

- The implementation respects the feature flag and does NOT break existing multi-vendor logic
- All vendor assignment logic is isolated to single mode
- Cart clearing on vendor change prevents cross-vendor orders
- Edge function handles errors gracefully and marks orders as `unfulfillable` when needed
- Notifications are sent to admins when assignment fails
