# Parallel photo reports

HOUSE CLEANING STAFF stores an active cleaner report by `employee + order` and photo drafts by `employee + order + stage`.

For teams, only the lead cleaner selected by the manager can start and manage the checklist and photo report. A lead cleaner may have more than one active report at once; switching between tasks does not mix files, checklist state, timers or completion state.

Uploads are idempotent per client file id and use multipart/form-data without manually setting `Content-Type`, allowing the browser to supply the boundary correctly on iOS.
