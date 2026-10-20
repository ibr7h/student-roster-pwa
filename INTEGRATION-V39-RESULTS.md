# v3.9 account lifecycle integration

- Tested: 2026-10-20T14:12:34Z UTC
- Disposable PostgreSQL 16 in CI, not Neon production
- Pending registration, invalid/valid one-time verification, account creation, global login, single-use school license, school data embargo, cross-school isolation, member RBAC, password recovery and session revocation
- No actual emails were sent: test transport recorded codes in memory
- Production and test Neon accounts were not changed by this test
