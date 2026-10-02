# Contributing

Use Node.js 22 or newer and install FFmpeg before running `npm ci` and `npm test`.

Keep scene evaluation independent of wall-clock time and mutable random state. Preserve supplied word text, stable IDs, and timestamps when changing visual layout. Declare every image and font dependency in the project manifest so the cache can invalidate correctly.

For renderer changes, test random-access seeking and inspect a real exported clip. For changes to section boundaries, transitions, or assets, include a focused cache invalidation regression. Tests and examples should create synthetic inputs instead of depending on private recordings or external services.

Submit changes with a concise explanation of the behavior and the verification performed. Contributions are provided under the repository's MIT license. Preserve notices for any separately licensed material.
