# API compatibility policy

The Flask service exposes the same authenticated view functions at two route
families:

- `/api/...` is the legacy surface used by released web and mobile clients.
- `/api/v1/...` is the versioned contract for new consumers.

Within `v1`, changes must be backward-compatible and additive. Existing fields,
status codes, and meanings are not renamed or removed. A removal or incompatible
semantic change requires a future API version.

The legacy routes remain operational until production adoption is measured and
all released clients that depend on them have aged out. Adding `v1` does not set
a removal date for `/api`.
