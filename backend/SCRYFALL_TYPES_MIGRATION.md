# Scryfall API Types Migration Plan

## Executive Summary

This document outlines the migration from custom Scryfall type definitions to the official `@scryfall/api-types` package for the mtg-companion-api Lambda function.

**Current State**: 34 custom type definitions in `src/types.ts`
**Target State**: Official `@scryfall/api-types` package with custom extensions
**Impact**: Backend (lambda/mtg-companion-api) + Frontend (www/mtgc-web)
**Risk Level**: Medium - Type changes may affect 10+ frontend components

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Official Package Overview](#official-package-overview)
3. [Gap Analysis](#gap-analysis)
4. [Migration Strategy](#migration-strategy)
5. [Step-by-Step Migration Plan](#step-by-step-migration-plan)
6. [Breaking Changes & Risks](#breaking-changes--risks)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)

---

## Current Implementation Analysis

### File Structure

```
lambda/mtg-companion-api/src/
├── types.ts (381 lines)           # All custom type definitions
├── card-utils.ts (193 lines)      # Mapping & utility functions
├── validators.ts (160 lines)      # Zod validation schemas
└── mtg-companion-api.ts (2201)    # API implementation
```

### Type Categories (34 Total)

#### 1. Scryfall API Types (4 types)
- `ScryfallImageUris` - Card image URLs (6 sizes)
- `ScryfallCardFace` - Individual faces of multi-face cards
- `ScryfallApiCard` - Primary card object (curated subset of Scryfall API)
- `ScryfallListResponse<T>` - Paginated list responses

#### 2. Database Objects (8 types)
- `CardDbo` - Database representation of cards
- `PlaceDbo`, `InventoryItemDbo`, `MasterInventoryDbo`
- `InventoryDetailDbo`, `DeckDbo`, `DeckCardDbo`
- Enums: `PlaceType`, `CardCondition`, `LanguageCode`

#### 3. API Payloads & Responses (16 types)
- Request payloads for CRUD operations
- Response types with joined card details
- Pagination responses

#### 4. Utility Types (6 types)
- Mapping function signatures
- Composed types for complex responses

### Current Data Flow

```
Scryfall API Response (JSON)
        ↓
ScryfallApiCard (custom type)
        ↓
mapScryfallCardToDbo()
        ↓
CardDbo (with JSON string fields)
        ↓
Database Storage (SQLite/D1)
        ↓
mapDboToScryfallApiCard()
        ↓
ScryfallApiCard (custom type)
        ↓
API Response to Frontend
```

### Frontend Usage

**Affected Files**: 10+ components in `www/mtgc-web/`
- Import via path alias: `import { ScryfallApiCard } from "#/backend/src/types"`
- Heavy usage in card display, inventory, and deck management components

**Key Import Patterns**:
```typescript
import { ScryfallApiCard } from "#/backend/src/types";
import { getCardLocalizedImageUri } from "#/backend/src/card-utils";
import { CARD_CONDITIONS_ARRAY } from "#/backend/src/validators";
```

---

## Official Package Overview

### Package Details

- **Package Name**: `@scryfall/api-types`
- **License**: MIT
- **Language**: 99.8% TypeScript
- **Versioning**: Semantic versioning (independent of Scryfall API versions)

### Main Exported Types

1. **`ScryfallCard`** - Comprehensive card type with layout-based narrowing
2. **`ScryfallList`** - Generic list type for paginated responses
3. **`ScryfallCatalog`** - Catalog endpoint types
4. **`ScryfallSet`** - Set data types
5. **`ScryfallError`** - Error response types
6. **`ScryfallMigration`** - Migration object types

### Key Features

- **Type Narrowing**: Uses `layout` field for precise type discrimination
- **Namespace Prefix**: All types prefixed with "Scryfall" to avoid conflicts
- **Flexible Enums**: Fields available as both enums and string unions
- **Complete Coverage**: All official Scryfall API objects supported

---

## Gap Analysis

### What the Official Package Provides

✅ **Complete card object** (`ScryfallCard`)
- All fields from Scryfall API (not curated subset)
- Layout-based type narrowing
- All image URIs, pricing, identifiers

✅ **List responses** (`ScryfallList<T>`)
- Generic paginated response type
- Supports all Scryfall list endpoints

✅ **Error handling** (`ScryfallError`)
- Standardized error response types

✅ **Sets and Catalogs**
- Comprehensive set data types
- Catalog endpoint types

### What We Need to Keep Custom

❌ **Database Objects** - Application-specific
- `CardDbo`, `PlaceDbo`, `InventoryItemDbo`, etc.
- These are internal representations, not Scryfall API types

❌ **API Payloads & Responses** - Business logic specific
- `CreatePlacePayload`, `UpdateInventoryItemPayload`, etc.
- `InventoryItemWithCardDetails`, `DeckWithDetails`, etc.

❌ **Enums** - Application-specific
- `PlaceType`, `CardCondition` - Not from Scryfall API
- `LanguageCode` - May exist in official package, needs verification

❌ **Mapping Functions** - Business logic
- `mapScryfallCardToDbo()`, `mapDboToScryfallApiCard()`
- Database serialization logic

### Key Differences to Address

| Custom Type | Official Equivalent | Differences |
|-------------|---------------------|-------------|
| `ScryfallApiCard` | `ScryfallCard` | Custom is curated subset (missing arena_id, mtgo_id, prices, etc.) |
| `ScryfallImageUris` | Likely `Card.ImageUris` | May have different optional fields |
| `ScryfallCardFace` | Likely `CardFace` | May have more fields in official version |
| `ScryfallListResponse<T>` | `ScryfallList<T>` | Likely identical structure |

### Critical Questions to Resolve

1. **Field Compatibility**: Are our curated fields a strict subset of `ScryfallCard`?
2. **Nullability**: Do nullable fields match (`null` vs `undefined` vs `optional`)?
3. **Type Narrowing**: Will layout-based narrowing affect our mapping functions?
4. **Enum Compatibility**: Do string unions match our rarity/legality values?

---

## Migration Strategy

### Approach: Gradual Replacement with Type Aliasing

**Phase 1**: Install package and create compatibility layer
**Phase 2**: Replace Scryfall API types with official types
**Phase 3**: Update mapping functions and validators
**Phase 4**: Update frontend imports
**Phase 5**: Clean up and remove old types

### Design Principles

1. **Backward Compatibility**: Maintain existing API contracts
2. **Type Safety**: No `any` types, strict TypeScript compilation
3. **Incremental**: Migrate file-by-file, not all-at-once
4. **Testable**: Verify at each step with existing data
5. **Reversible**: Keep rollback option until fully deployed

### Compatibility Layer Strategy

Create a `scryfall-types.ts` file that re-exports official types with local aliases:

```typescript
// New file: src/scryfall-types.ts
import type {
  ScryfallCard,
  ScryfallList,
  // ... other official types
} from '@scryfall/api-types';

// Re-export with backwards-compatible names if needed
export type ScryfallApiCard = ScryfallCard;
export type ScryfallListResponse<T> = ScryfallList<T>;

// Or use official names directly
export type { ScryfallCard, ScryfallList };
```

---

## Step-by-Step Migration Plan

### Prerequisites

- [ ] Review official package documentation thoroughly
- [ ] Create feature branch: `migrate-scryfall-types`
- [ ] Back up current implementation
- [ ] Document all current type usages

### Step 1: Package Installation

```bash
cd lambda/mtg-companion-api
npm install @scryfall/api-types
```

**Files to modify**:
- `lambda/mtg-companion-api/package.json`

**Verification**:
```bash
npm ls @scryfall/api-types
```

### Step 2: Type Compatibility Analysis

**Task**: Create test file to compare types

**Files to create**:
- `lambda/mtg-companion-api/src/__tests__/type-compatibility.test.ts`

**Test checklist**:
- [ ] Load sample Scryfall API response
- [ ] Cast to both `ScryfallApiCard` and `ScryfallCard`
- [ ] Verify no TypeScript errors
- [ ] Check field-by-field compatibility
- [ ] Test with multi-face cards (DFC, split, transform)
- [ ] Test with various layouts

**Sample test**:
```typescript
import type { ScryfallCard } from '@scryfall/api-types';
import type { ScryfallApiCard } from '../types';

describe('Type Compatibility', () => {
  it('should handle official ScryfallCard as custom ScryfallApiCard', () => {
    const officialCard: ScryfallCard = loadSampleCard();
    const customCard: ScryfallApiCard = officialCard as any; // This should work or reveal issues
    expect(customCard.name).toBe(officialCard.name);
  });
});
```

### Step 3: Create Compatibility Layer

**Files to create**:
- `lambda/mtg-companion-api/src/scryfall-types.ts`

**Content**:
```typescript
/**
 * Official Scryfall API types compatibility layer
 * Migrating from custom types to @scryfall/api-types
 */

import type {
  Card as ScryfallCard,
  List as ScryfallList,
  // Import other needed types
} from '@scryfall/api-types';

// Export official types with our preferred names
export type { ScryfallCard, ScryfallList };

// If needed, create subset types for database mapping
export type ScryfallApiCard = Pick<ScryfallCard,
  | 'id'
  | 'oracle_id'
  | 'name'
  | 'lang'
  | 'released_at'
  // ... list all fields we actually use
>;

// Or use full type if compatible
export type ScryfallApiCard = ScryfallCard;
```

### Step 4: Update types.ts

**File to modify**: `lambda/mtg-companion-api/src/types.ts`

**Changes**:
```typescript
// OLD:
export interface ScryfallImageUris { ... }
export interface ScryfallCardFace { ... }
export interface ScryfallApiCard { ... }
export interface ScryfallListResponse<T> { ... }

// NEW:
export type {
  ScryfallCard as ScryfallApiCard,
  ScryfallList as ScryfallListResponse,
} from './scryfall-types';

// Keep all other custom types (CardDbo, PlaceDbo, etc.)
```

**Verification**:
```bash
npm run build
# Should compile without errors
```

### Step 5: Update card-utils.ts

**File to modify**: `lambda/mtg-companion-api/src/card-utils.ts`

**Changes**:
- Update import statements to use new types
- Verify mapping functions still work with official types
- Test with sample data

**Key functions to verify**:
- `getCardImageUri()` - May need adjustments for field access
- `getCardLocalizedImageUri()` - Verify return type compatibility
- `mapScryfallCardToDbo()` - Critical: may need field access updates
- `mapDboToScryfallApiCard()` - Critical: may need type casting

**Example adjustment**:
```typescript
// OLD:
import type { ScryfallApiCard } from './types';

// NEW:
import type { ScryfallCard as ScryfallApiCard } from './scryfall-types';
// OR if using direct import:
import type { ScryfallApiCard } from './scryfall-types';
```

### Step 6: Update validators.ts

**File to modify**: `lambda/mtg-companion-api/src/validators.ts`

**Changes**:
- Check if official package exports enums (Rarity, Legality, etc.)
- Update Zod schemas if enum definitions change
- Keep custom validators (PlaceType, CardCondition) as-is

**Potential updates**:
```typescript
// Check if official package has these:
import { Rarity, LegalityStatus } from '@scryfall/api-types';

// Update Zod schemas to match
const raritySchema = z.enum(['common', 'uncommon', 'rare', 'mythic', ...]);
```

### Step 7: Update Main API File

**File to modify**: `lambda/mtg-companion-api/src/mtg-companion-api.ts`

**Changes**:
- Update type imports
- Verify all API endpoints still type-check correctly
- Test Scryfall API fetch and type casting

**Key sections**:
1. Import statements (lines ~1-20)
2. Scryfall search route (uses `ScryfallListResponse`)
3. Card fetch routes (casts to `ScryfallApiCard`)
4. Inventory/Deck routes (uses composed types)

### Step 8: Update Frontend Imports

**Files to modify**: All files in `www/mtgc-web/` importing Scryfall types

**Affected files** (estimated 10+):
- `components/home/home-top-cards-grid.tsx`
- `components/inventory/inventory-grid-item.tsx`
- `components/card/card-detail-modal-content.tsx`
- `components/decks/editor/types.ts`
- `utils/card-utils.ts`
- Others...

**Migration pattern**:
```typescript
// OLD:
import { ScryfallApiCard } from "#/backend/src/types";

// NEW (Option 1): Keep import path, export changed
import { ScryfallApiCard } from "#/backend/src/types";
// types.ts now re-exports from scryfall-types.ts

// NEW (Option 2): Import from new file
import { ScryfallApiCard } from "#/backend/src/scryfall-types";

// NEW (Option 3): Import official type directly (if package is accessible)
import type { ScryfallCard } from '@scryfall/api-types';
```

**Recommendation**: Use Option 1 to minimize frontend changes.

### Step 9: Update Tests

**Files to modify**: Any test files using Scryfall types

**Tasks**:
- Update mock data to match official type structure
- Add tests for mapping functions with official types
- Test API endpoints with official response types

### Step 10: Database Migration Check

**Files to verify**: `db/schema.sql`, `db/test-seed.sql`

**Tasks**:
- Verify database schema still matches mapped types
- Confirm JSON serialization works with official types
- Test with sample Scryfall data (various layouts)

**No schema changes expected** - This is purely a TypeScript change.

### Step 11: Documentation Updates

**Files to update**:
- `README.md` - Add note about official types usage
- `package.json` - Document the new dependency
- Inline comments - Update references to "custom types"

### Step 12: Final Cleanup

**Files to modify**: `lambda/mtg-companion-api/src/types.ts`

**Tasks**:
- Remove old custom Scryfall type definitions
- Keep only application-specific types (DBO, payloads, etc.)
- Organize imports clearly

**Final structure**:
```typescript
// src/types.ts
// Re-export official Scryfall types
export type {
  ScryfallCard as ScryfallApiCard,
  ScryfallList as ScryfallListResponse,
} from './scryfall-types';

// Application-specific types only
export interface CardDbo { ... }
export interface PlaceDbo { ... }
// ... etc.
```

---

## Breaking Changes & Risks

### High Risk

1. **Field Name Differences**
   - **Risk**: Official types may use different names (e.g., `image_uris` vs `imageUris`)
   - **Mitigation**: Comprehensive compatibility testing before migration
   - **Rollback**: Keep old types in separate file until verified

2. **Nullability Changes**
   - **Risk**: `null` vs `undefined` vs optional fields may differ
   - **Impact**: Mapping functions may break, runtime null checks may fail
   - **Mitigation**: Strict TypeScript compilation, unit tests for all edge cases

3. **Layout-Based Type Narrowing**
   - **Risk**: Official types use discriminated unions by `layout` field
   - **Impact**: May require type guards when accessing layout-specific fields
   - **Mitigation**: Test with all card layouts (normal, split, transform, modal_dfc, etc.)

### Medium Risk

4. **Frontend Build Failures**
   - **Risk**: 10+ components import types, any incompatibility breaks builds
   - **Impact**: Frontend deployment blocked until fixed
   - **Mitigation**: Update backend first, test thoroughly, then update frontend

5. **Database Mapping Errors**
   - **Risk**: Serialization/deserialization may behave differently
   - **Impact**: Data corruption or loss if JSON parsing fails
   - **Mitigation**: Extensive testing with production data samples

### Low Risk

6. **Enum Value Differences**
   - **Risk**: Rarity or legality enums may have different values
   - **Impact**: Validation failures, UI display issues
   - **Mitigation**: Compare enum definitions, update validators

7. **Missing Fields in Official Types**
   - **Risk**: Scryfall may add/remove fields, official package may lag
   - **Impact**: TypeScript errors if accessing non-existent fields
   - **Mitigation**: Use optional chaining, fallback values

---

## Testing Strategy

### Unit Tests

**File**: `src/__tests__/scryfall-types.test.ts`

```typescript
describe('Scryfall Types Migration', () => {
  describe('Type Compatibility', () => {
    it('should handle normal layout cards', () => { ... });
    it('should handle double-faced cards', () => { ... });
    it('should handle split cards', () => { ... });
    it('should handle modal DFC cards', () => { ... });
  });

  describe('Mapping Functions', () => {
    it('should map ScryfallCard to CardDbo', () => { ... });
    it('should reconstruct ScryfallCard from CardDbo', () => { ... });
    it('should handle missing optional fields', () => { ... });
    it('should serialize complex objects to JSON', () => { ... });
  });

  describe('API Responses', () => {
    it('should handle ScryfallList responses', () => { ... });
    it('should handle paginated results', () => { ... });
  });
});
```

### Integration Tests

**File**: `src/__tests__/api-integration.test.ts`

1. **Scryfall API Fetch**
   - Fetch real card from Scryfall API
   - Cast to official `ScryfallCard` type
   - Map to `CardDbo`
   - Store in database
   - Retrieve and reconstruct
   - Verify all fields match

2. **Frontend Type Compatibility**
   - Build frontend with updated types
   - Run existing frontend tests
   - Verify no TypeScript errors

3. **Database Round-Trip**
   - Insert cards with various layouts
   - Retrieve and verify JSON parsing
   - Check for data loss or corruption

### Manual Testing Checklist

- [ ] Search Scryfall API and store results
- [ ] View card details in frontend
- [ ] Add cards to inventory
- [ ] Create deck with various card types
- [ ] Test with non-English cards
- [ ] Test with special layouts (flip, split, adventure, etc.)
- [ ] Verify image URIs resolve correctly
- [ ] Check localization functionality

### Performance Testing

- [ ] Measure mapping function performance (before/after)
- [ ] Check bundle size impact on frontend
- [ ] Verify no regression in API response times

---

## Rollback Plan

### If Migration Fails

1. **Immediate Rollback**
   ```bash
   git checkout main
   git branch -D migrate-scryfall-types
   ```

2. **Partial Rollback** (if some files migrated)
   - Revert `types.ts` changes
   - Remove `scryfall-types.ts`
   - Uninstall package: `npm uninstall @scryfall/api-types`
   - Restore custom type definitions from git history

3. **Keep Package, Delay Migration**
   - Keep `@scryfall/api-types` installed
   - Don't use it yet in code
   - Continue investigation offline

### Rollback Triggers

- TypeScript compilation errors that can't be fixed in 2 hours
- Database data corruption in testing
- Frontend build failures affecting >3 components
- Performance degradation >20%
- Team consensus to pause migration

---

## Success Criteria

### Migration is Complete When:

- [x] `@scryfall/api-types` package installed
- [x] All custom Scryfall API types replaced with official types
- [x] All tests passing (unit + integration)
- [x] Frontend builds successfully
- [x] No TypeScript errors in strict mode
- [x] Backend API functional with real Scryfall data
- [x] Frontend components render cards correctly
- [x] Database mapping functions work without data loss
- [x] Code review approved
- [x] Deployed to staging environment
- [x] Manual QA testing complete

### Post-Migration Validation

1. **Monitor Production** (first 48 hours)
   - Watch for runtime errors related to type mismatches
   - Monitor API error rates
   - Check database logs for JSON parsing errors

2. **Performance Baseline**
   - Compare API response times before/after
   - Check frontend bundle size
   - Measure mapping function execution time

3. **Documentation Review**
   - Update README with new import patterns
   - Document any workarounds or known issues
   - Create migration guide for future reference

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Prerequisites & Analysis | 2 hours | None |
| Package Installation | 15 min | Prerequisites complete |
| Type Compatibility Testing | 4 hours | Package installed |
| Create Compatibility Layer | 2 hours | Testing complete |
| Update Backend (Steps 4-7) | 6 hours | Compatibility layer ready |
| Update Frontend (Step 8) | 4 hours | Backend updated |
| Testing (Unit + Integration) | 6 hours | All updates complete |
| Documentation & Cleanup | 2 hours | Tests passing |
| Code Review & Deployment | 2 hours | All above complete |
| **Total** | **~28 hours** | ~1 week calendar time |

---

## Open Questions

1. **Does the official package export `ImageUris` and `CardFace` types separately?**
   - Need to verify if we can import these directly or must extract from `ScryfallCard`

2. **Are there TypeScript utility types for extracting specific card layouts?**
   - Example: `Extract<ScryfallCard, { layout: 'transform' }>`

3. **Does the package include language code types?**
   - We have custom `LanguageCode` type - check if official package has this

4. **What's the package's release cadence?**
   - How quickly do they update when Scryfall API changes?

5. **Are there TypeScript version requirements?**
   - We're on TypeScript 5.9.3 - verify compatibility

6. **Does the package support both CommonJS and ESM?**
   - Check if we need build configuration changes

---

## References

- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Official Types Repository](https://github.com/scryfall/api-types)
- [TypeScript Handbook - Type Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- Internal: `lambda/mtg-companion-api/src/types.ts`
- Internal: `lambda/mtg-companion-api/db/schema.sql`

---

## Appendix A: Current Type Inventory

### Types to Migrate (4)
- `ScryfallImageUris` → Official package equivalent
- `ScryfallCardFace` → Official package equivalent
- `ScryfallApiCard` → `ScryfallCard` from official package
- `ScryfallListResponse<T>` → `ScryfallList<T>` from official package

### Types to Keep (30)
All application-specific types:
- Database objects (8): `CardDbo`, `PlaceDbo`, etc.
- Enums (3): `PlaceType`, `CardCondition`, `LanguageCode`
- API payloads (7): `CreatePlacePayload`, etc.
- Response types (9): `InventoryItemWithCardDetails`, etc.
- Utility types (3): Mapping functions, pagination

---

## Appendix B: Frontend Impact Analysis

### Components Using Scryfall Types

1. **Card Display** (4 components)
   - `home-top-cards-grid.tsx`
   - `inventory-grid-item.tsx`
   - `card-detail-modal-content.tsx`
   - `card-image.tsx`

2. **Inventory Management** (3 components)
   - `add-print-modal.tsx`
   - `inventory-card-details.tsx`
   - `master-inventory-item.tsx`

3. **Deck Management** (2 components)
   - `editor/types.ts`
   - `deck-card-item.tsx`

4. **Utilities** (1 file)
   - `utils/card-utils.ts`

**Total Impact**: ~10 files across 3 major feature areas

---

## Appendix C: Database Schema Reference

```sql
-- Current Cards table structure
CREATE TABLE Cards (
  scryfall_id TEXT PRIMARY KEY,
  oracle_id TEXT,
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  -- ... 20+ more fields
  colors TEXT,              -- JSON stringified
  keywords TEXT,            -- JSON stringified
  image_uris TEXT,          -- JSON stringified
  card_faces TEXT,          -- JSON stringified
  legalities TEXT,          -- JSON stringified
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Migration Impact**: None - Database schema remains unchanged.

---

*Document Version: 1.0*
*Created: 2025-11-17*
*Author: Migration Planning*
*Status: Draft - Ready for Review*
