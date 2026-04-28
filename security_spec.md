# Security Specification: Pitch Precision

## Data Invariants
1. A Project must always have an `ownerId` that matches the authenticated user.
2. `createdAt` is immutable after creation.
3. `stages` must be a list of 1-10 items.
4. Document IDs must be sanitized (isValidId).
5. Only the owner can read, update, or delete their projects.

## The Dirty Dozen Payloads (Targeting Projects)
1. **The Identity Thief**: Create a project with `ownerId` set to another user's UID.
2. **The Time Traveler**: Update a project and modify the `createdAt` timestamp.
3. **The Ghost Field**: Add an `isVerified: true` field to a project document.
4. **The Long Name**: Try to set a project name with 5MB of text.
5. **The Orphaned Project**: Create a project without being signed in.
6. **The Stage Bomb**: Try to add 1,000 stages to a single project.
7. **The ID Injector**: Use a document ID containing malicious characters like `../secret`.
8. **The PII Scraper**: List all projects without any filter (relying on client-side filtering).
9. **The Cross-Account Read**: Perform a `get` on a project ID belonging to another user.
10. **The Self-Promotion**: Try to change the `ownerId` of an existing project to someone else.
11. **Malicious Metadata**: Try to inject metadata fields like `_sys_admin_control`.
12. **The Blank Project**: Create a project with empty name and studentId.

## Verification
The `firestore.rules` will explicitly block all the above payloads by:
- Enforcing `ownerId == request.auth.uid`.
- Using `affectedKeys().hasOnly()` on updates.
- Validating string sizes and list sizes.
- Validating document IDs with regex.
- Enforcing `resource.data.ownerId == request.auth.uid` on lists.
