# Days 1–3 foundation contract

## Scope

Day 1–3 establishes one tenant-aware foundation:

1. School Admin, Teacher and Student can authenticate.
2. Each account resolves membership for the selected tenant.
3. School Admin can see seeded classes and membership data on web.
4. Student can see only enrolled classes on mobile.
5. Tenant A cannot read or write Tenant B data.

Out of scope: account invitation UI, assignments, file uploads, AI, community, notifications and dynamic roles.

## Ownership

| Lane | Paths |
|---|---|
| Platform/Data | `supabase/**`, shared contracts |
| Web | `apps/web/**` |
| Mobile | `apps/mobile/**` |
| Reviewer | Cross-tenant/RLS tests and evidence |

## Roles

| Action | School Admin | Teacher | Student |
|---|---:|---:|---:|
| Read tenant profile | Yes | Yes | Yes |
| Read class | Tenant classes | Assigned classes | Enrolled classes |
| Read class members | Tenant classes | Assigned classes | No |
| Create/update class | Yes | No | No |
| Change membership | Yes | No | No |

The server never trusts a client-provided tenant without validating the authenticated membership. Request paths use the user's JWT; service-role is restricted to migrations, seed and offline operations.

## Minimal API contract

```text
POST /api/auth/login
GET  /api/session
GET  /api/classes
GET  /api/classes/:id
```

Day 3 UI may read Supabase directly with the user's JWT while RLS is the source of authorization. A BFF becomes mandatory when write workflows start on Day 4.

## Foundation gate

- Three roles can sign in for each seeded tenant.
- `supabase db reset` reproduces schema and seed.
- Every business table has RLS enabled.
- Cross-tenant reads return zero rows or an authorization error.
- Web renders the class split view at 1440px without overflow.
- Android renders Home/Class at 412×915 without clipped primary content.
