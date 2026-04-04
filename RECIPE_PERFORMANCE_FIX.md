# Recipe Performance Fix - Large Payload Issue

## Problem Identified

**Root Cause:** The `/recipes` endpoint was returning a 12.8MB response because:
- You have 63 recipes in the database
- Many recipes contain full base64-encoded images (can be 200KB+ each)
- All images were being sent with every recipe list request

**Symptoms:**
- Recipes failing to save intermittently
- Saved recipes disappearing after a reload
- Slow page loads
- Request timeouts

## Solution Implemented

Updated the server to automatically detect large payloads and strip images when necessary:

```typescript
// In /supabase/functions/server/index.tsx
// If payload > 5MB, images are automatically stripped from the list response
// Individual recipe views still show full images
```

### How It Works:

1. **Small libraries (<5MB):** All images load normally
2. **Large libraries (>5MB):** Images are stripped from list view
   - Recipe cards show placeholder icons instead
   - Individual recipe pages still load full images
   - A warning is logged to the console

## Supabase Limitations

The Figma Make environment uses a **simple key-value store** which is not optimized for:
- Large binary data (like images)
- High-volume queries
- Pagination

### Recommended Best Practices:

1. **For production apps:** Use Supabase Storage for images, store only URLs in the database
2. **For prototypes:** Limit the number of recipes with images, or use smaller images
3. **Alternative:** Use external image URLs instead of base64-encoded data

## Testing

After the server redeploys:
1. Navigate to `/recipes-library`
2. Check browser console for payload size logs
3. Recipes should load reliably now
4. If images are stripped, you'll see a warning message

## Status

✅ Fix applied to server code
⏳ Waiting for Supabase to redeploy the edge function
✅ Frontend already handles missing images gracefully
