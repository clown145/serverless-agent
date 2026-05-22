# HTTP Tools

`http.request` sends a structured HTTP(S) request to public internet endpoints.
It is intended for API calls where the agent needs curl-like flexibility.

The tool:

- supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `HEAD`.
- supports JSON, text, URL-encoded form, multipart, base64, or empty request bodies.
- supports multipart files from VFS, message attachments, public URLs, or base64 data.
- supports encrypted cookie jars with disabled, send, store, and send-and-store modes.
- blocks localhost, private IPv4 ranges, IPv6 local ranges, and mapped private addresses.
- follows redirects manually and validates every redirected URL before requesting it.
- truncates responses and returns a safe subset of response headers.

It uses permission level 4 with the `http:request` scope.
