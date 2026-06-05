// This file MUST be just this one import.
// Module Federation requires an async boundary at the entry point
// so that shared modules (React) can be negotiated between host and remotes.
import("./bootstrap");
